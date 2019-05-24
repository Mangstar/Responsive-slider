const
        q  = el => document.querySelector( el ),
        qA = elems => document.querySelectorAll( elems );

const _getType = type => {
    return Object.prototype.toString.call(type).slice(8, -1);
};

const _copyArray = array => {
    return array.map( el => {
        if ( _getType( el ) === 'Object' ) {
            return _copyObject( el );
        } else if ( _getType( el ) === 'Array' ) {
            return _copyArray( el );
        } else {
            return el;
        }
    });
};

const _copyObject = obj => {
    const copyObj = {};

    for( let key in obj ){
        let
            type = _getType( obj[ key ] );

        if ( type === 'Object' ) {
            copyObj[ key ] = _copyObject( obj[ key ] );
        } else if( type === 'Array' ){
            copyObj[ key ] = _copyArray( obj[ key ] );
        } else {
            copyObj[ key ] = obj[ key ];
        }
    }

    return copyObj;
};

const _extend = (obj1, obj2) => {
    const resObj = {};

    let type = null;

    for( let key in obj1 ){
        if ( obj2[ key ] === undefined ) {

            type = _getType( obj1[ key ] );

            if ( type === 'Object' ) {
                resObj[ key ] = _copyObject(obj1[ key ]);
            } else if ( type === 'Array' ) {
                resObj[ key ] = _copyArray(obj1[ key ]);
            } else {
                resObj[ key ] = obj1[ key ];
            }

        } else {

            type = _getType( obj2[ key ] );

            if ( type === 'Object' && Object.hasOwnProperty(key) ) {
                resObj[ key ] = _copyObject(obj2[ key ]);
            } else if ( type === 'Array' && Object.hasOwnProperty(key) ) {
                resObj[ key ] = _copyArray(obj2[ key ]);
            }  else if ( Object.hasOwnProperty(key) ) {
                resObj[ key ] = obj2[ key ];
            }

        }
    }
    return resObj;
};

class Slider {
    constructor(el, options = {}){
        // DOM
        this.slider          = q( el );
        this.sliderContent   = this.slider.querySelector('.slider-content');
        this.scrollContainer = null;
        this.slides          = Array.from(this.slider.querySelectorAll('.slide'));
        this.buttonPrev      = this.slider.querySelector('.slider-button--prev');
        this.buttonNext      = this.slider.querySelector('.slider-button--next');

        const
                _defaults = {
                    startIndex: 1,
                    elemsCount: 3,
                    elemsScroll: 1,
                    offset: 15,
                    lazyLoad: true,
                    breakPoints: {
                        768: {
                            elemsCount: 2,
                            elemsScroll: 1,
                            offset: 10
                        },
                        576: {
                            elemsCount: 1,
                            elemsScroll: 1
                        }
                    }
                },
                _settings = _extend(_defaults, options);
        
        // Slider options
        this.slidesLength           = this.slides.length;
        // Количество слайдов на экране, без учета брейкпоинтов
        this.sliderElemsCountStart  = _settings.elemsCount;
        this.startIndex             = _settings.startIndex;
        // Позиция первого слайда, если переданное значение не отрицательно и не больше максимального количества слайдов с учетом слайдов на экране
        this.slideIndex             = this.startIndex > 0 && this.startIndex <= (this.slidesLength - this.sliderElemsCountStart) ? this.startIndex - 1 : 0;
        // Начальное количество одновременно прокручиваемых элементов
        this.elemsScrollStart       = _settings.elemsScroll;
        this.breakPoints            = _settings.breakPoints;
        // Массив с разрешениями экранов брейкпоинтов
        this.breakPointsList        = Object.keys(this.breakPoints);
        this.breakPointMax          = Math.max.apply(null, this.breakPointsList);
        // Начальный отступ между слайдами без учета брейкпоинтов
        this.offsetStart            = _settings.offset;
        // Есть ли lazyload
        this.lazyLoad               = _settings.lazyLoad;
        
        // Рассчитываем количество элементов на экране
        this._calcSliderElemsCount();
        // Рассчитываем отступ между слайдами
        this.offset                 = this.sliderElemsCount !== 1 ? this._calcOffset() : 0;

        // Отмечаем все слайды, которые в данный момент на экране
        this._getShownClasses();
        
        // Проверяем, нет ли изображений в слайдере, которые необходимо подгрузить сейчас
        this._loadLazyImages();

        this._getElemsScroll();
        
        // Максимально-возможная прокрутка
        this.allowedScroll          = this._recalcAllowedScroll();
        // Текущая прокрутка
        this.currentScroll          = -(this._calcSlideWidth() + this.offset) * this.slideIndex;
        
        // Прокручиваем слайдер к начальному слайду
        this._setStyles( this.sliderContent, {
            marginLeft:  this.sliderElemsCount !== 1 ? -this.offset + 'px' : '0px',
            marginRight: this.sliderElemsCount !== 1 ? -this.offset + 'px' : '0px'
        });

        // Оборачиваем слайды в блок, который будет прокручиваться
        this._createScrollContainer();

        // Задаем ширину слайдам
        this._getClosestBreakPoint();
        this._setSlideWidth();

        // Выравниваем кнопки по высоте
        this._raf(this._verticalButtonsAlign, this);

        // Следующий слайд
        this.buttonNext.addEventListener('click', () => {
            this.nextSlide();
        });

        // Предыдущий слайд
        this.buttonPrev.addEventListener('click', () => {
            this.prevSlide();
        });
    }

    // Методы экземпляра

    nextSlide(){
        this.slideIndex++;

        if ( this.slideIndex > this.slidesLength - this.sliderElemsCount ) {
            this.slideIndex = 0;
        }
        
        // Обновить у слайдов класс 'shown-slide'
        this._getShownClassesNext();

        // Проверить изображения на ленивую загрузку
        this._loadLazyImages();
        
        // Если текущий скролл больше максимально-допустимого, обнуляем его
        if ( Math.abs(this.currentScroll) < this.allowedScroll ) {
            this.currentScroll -= (this._calcSlideWidth() + this.offset) * this.elemsScroll < this.allowedScroll
                                                                                                                    ? (this._calcSlideWidth() + this.offset) * this.elemsScroll
                                                                                                                    : this.allowedScroll;
        } else {
            this.currentScroll = 0;
        }

        this._setStyles(
            this.scrollContainer,
            {
                transform: `translateX(${ this.currentScroll }px)`
            }
        )
    }

    prevSlide(){
        this.slideIndex--;

        if ( this.slideIndex < 0 ) {
            this.slideIndex = this.slidesLength - this.sliderElemsCount;
        }
        
        this._getShownClassesPrev();

        this._loadLazyImages();

        if ( this.currentScroll < 0 ) {
            this.currentScroll += (this._calcSlideWidth() + this.offset) * this.elemsScroll;
        } else {
            this.currentScroll = -this.allowedScroll;
        }

        this._setStyles(
            this.scrollContainer,
            {
                transform: `translateX(${ this.currentScroll }px)`
            }
        )
    }

    _calcOffset(){
        let
            array   = this.breakPointsList.slice(),
            closest,
            offset;

        while( array.length > 0 ) {

            closest = Number(this._findClesestNumber(array, this._getWindowSize() ));

            if( this._getWindowSize() <= closest ){
                if ( this.breakPoints[ closest ].offset !== undefined ) {
                    offset = this.breakPoints[ closest ].offset;
                }
            }

            array.splice(array.indexOf(closest + ''), 1);
        }

        if ( this._getWindowSize() > this.breakPointMax ) {
            offset = this.offsetStart;
        }

        return offset;
    }

    _getShownClasses(){
        this.slides.forEach( slide => slide.classList.remove('shown-slide'));

        this.slides.filter((slide, index, slides) => {
            if ( index + this.slideIndex < this.slideIndex + this.sliderElemsCount ) {
                if ( index + this.slideIndex <= this.slidesLength ) {
                    slides[ index + this.slideIndex ].classList.add('shown-slide');
                }
            }
        });
    }

    _getShownClassesNext(){
        this.slides.forEach( slide => slide.classList.remove('shown-slide'));
        
        this.slides.filter((slide, index, slides) => {
            if ( this.slideIndex + index < this.slideIndex + this.sliderElemsCount ) {
                slides[ this.slideIndex + index ].classList.add('shown-slide');
            }
        });
    }

    _getShownClassesPrev(){
        this.slides.forEach( slide => slide.classList.remove('shown-slide'));
        
        this.slides.filter((slide, index, slides) => {
            if ( this.slideIndex + index < this.slidesLength && this.slideIndex + index < this.sliderElemsCount + this.slideIndex ) {
                slides[ this.slideIndex + index ].classList.add('shown-slide');
            }
        });
    }

    _createScrollContainer(){
        const
                cloneSlides      = this.slider.querySelectorAll('.slide'),
                scrollContainer  = this._createDOMElement('DIV', {
                    class: ['scroll-container']
                });

        this._setStyles( scrollContainer, {
            width: (this._calcSlideWidth() + this.offset) * this.slidesLength + 'px',
            transform: `translateX(${ this.currentScroll }px)`
        });
        
        // Добавляем склонированные слайды в контейнер прокрутки
        cloneSlides.forEach( cloneSlide => this._appendDOMElement(scrollContainer, cloneSlide));
        
        // Удаляем текущие слайды 
        this._removeDOMElem( this.slider, '.slide' );
        
        // Добавляем блок прокрутки со слайдами в Слайдер
        this.sliderContent.appendChild( scrollContainer );

        this._raf(
            () => this.scrollContainer = this.slider.querySelector('.scroll-container')
        );

        this._recalcSizesAndPositions();
    }

    _createDOMElement( tag, options ){
        const elem = document.createElement( tag );

        for( let opt in options ){
            if ( opt === 'class' ) {
                elem.className = options[ opt ].join(' ');
            } else {
                elem[ opt ] = options[ opt ];
            }
        }

        return elem;
    }

    _appendDOMElement( parent, elem ){
        parent.appendChild( elem );
    }

    _removeDOMElem( parent, elem ){
        let elems = parent.querySelectorAll(elem);

        for (let i = 0, len = elems.length; i < len; i++) {
            parent.removeChild( elems[ i ] );
        }
    }

    _verticalButtonsAlign(){
        [
            this.buttonPrev,
            this.buttonNext
        ].forEach( button => {
            button.style.top = (parseInt(this._getComputedStyle( this.slider, 'height' )) - parseInt(this._getComputedStyle( button, 'height' )) / 2) / 2 + 'px';
        });
    }

    _getComputedStyle( el, prop ){
        return window.getComputedStyle( el )[ prop ];
    }

    _calcSliderWidth(){
        return parseInt( window.getComputedStyle( this.slider ).width );
    }

    _calcSlideWidth(){
        return Math.floor(this._calcSliderWidth() / this.sliderElemsCount);
    }

    _calcSliderElemsCount(){
        let closest = Number(this._findClesestNumber(this.breakPointsList, this._getWindowSize() ));

        if( this._getWindowSize() <= closest ){
            this.sliderElemsCount = this.breakPoints[ closest ].elemsCount !== undefined
                                                                                        ? this.breakPoints[ closest ].elemsCount
                                                                                        : this.sliderElemsCountStart;
        }

        if ( this._getWindowSize() > this.breakPointMax ) {
            this.sliderElemsCount = this.sliderElemsCountStart;
        }
    }

    _setSlideWidth(){
        this.slides
            .forEach( slide => {
                this._setStyles(slide, {
                    width: this._calcSlideWidth() + 'px',
                    marginLeft:  this.sliderElemsCount !== 1 ? this.offset + 'px' : '0px',
                    marginRight: this.sliderElemsCount !== 1 ? this.offset + 'px' : '0px'
                });
            });
    }

    _setStyles( el, styles ){
        for ( let style in styles ) {
            el.style[ style ] = styles[ style ];
        }
    }

    _raf( fn, context ){
        return window.requestAnimationFrame(function(){
            return window.requestAnimationFrame(function(){
                fn.call( context );
            });
        });
    }

    _getWindowSize(){
        return document.documentElement.clientWidth;
    }

    _getElemsScroll(){
        let closest = Number(this._findClesestNumber(this.breakPointsList, this._getWindowSize() ));
        
        if( this._getWindowSize() <= closest ){
            this.elemsScroll = this.breakPoints[ closest ].elemsScroll !== undefined
                                                                                        ? this.breakPoints[ closest ].elemsScroll
                                                                                        : this.elemsScroll;
        }

        if ( this._getWindowSize() > this.breakPointMax ) {
            this.elemsScroll = this.elemsScrollStart;
        }
    }
    
    _findClesestNumber = (array, num) => {

        let
            closest      = Infinity,
            closetsIndex = 0;
    
        array.forEach( (number, index) => {
            if ( Math.abs(num - number) < closest && number >= this._getWindowSize() ) {
                closest = Math.abs(num - number);
                closetsIndex = index;
            }
        });
    
        return array[ closetsIndex ];
    }

    _getClosestBreakPoint(){
        let closest = Number(this._findClesestNumber(this.breakPointsList, this._getWindowSize() ));
        
        if( this._getWindowSize() <= closest ){
            this.sliderElemsCount = this.breakPoints[ closest ].elemsCount !== undefined
                                                                                        ? this.breakPoints[ closest ].elemsCount
                                                                                        : this.sliderElemsCount;
        }

        if ( this._getWindowSize() > this.breakPointMax ) {
            this.sliderElemsCount = this.sliderElemsCountStart;
        }
    }

    _recalcAllowedScroll(){
        return (this.slidesLength - this.sliderElemsCount) * (this._calcSlideWidth() + this.offset);
    }

    _loadLazyImages(){
        if ( this.lazyLoad ) {
            let shownSlides = Array.from(this.slider.querySelectorAll('.shown-slide'));

            shownSlides.forEach((slide, index, slides) => {
                let slideImage = slide.querySelector('img.slider-lazy');
                
                if ( slideImage !== null ) {
                    slideImage.src = slideImage.dataset.src;
                    slideImage.classList.remove('slider-lazy');
                }
            });
        }
    }

    _recalcSizesAndPositions(){
        let
            timer,
            abs,
            handler = () => {

                if ( timer !== undefined ) {
                    clearTimeout( timer );
                }

                timer = window.setTimeout(() => {
                   
                    // Пересчитываем позицию кнопок вперед/назад 
                    this._raf(this._verticalButtonsAlign, this);
                    
                    // Находим ближайший брейкпоинт
                    this._getClosestBreakPoint();
                    
                    // Пересчитываем отступ у слайдов
                    this.offset = this.sliderElemsCount !== 1 ? this._calcOffset() : 0;

                    // Максимальный скролл
                    this.allowedScroll = this._recalcAllowedScroll();

                    // Пересчитываем ширину слайдов
                    this._setSlideWidth();

                    // Пересчитываем количество одновременно прокручиваемых слайдов
                    this._getElemsScroll();

                    // Пересчитываем показанные классы
                    this._getShownClasses();
                    this._loadLazyImages();

                    // Направление, в какую сторону докрутить слайдер (влево/вправо)
                    abs = this.currentScroll / Math.abs(this.currentScroll) > 0 ? 1 : -1;

                    this.currentScroll = abs * (this._calcSlideWidth() + this.offset) * this.slideIndex;

                    this.currentScroll = Math.abs(this.currentScroll) > this.allowedScroll
                                                                                            ? -this.allowedScroll
                                                                                            : this.currentScroll;

                    this.currentScroll = this.currentScroll < 0 ? this.currentScroll : 0;

                    this._setStyles( this.sliderContent, {
                        marginLeft:  this.sliderElemsCount !== 1 ? -this.offset + 'px' : '0px',
                        marginRight: this.sliderElemsCount !== 1 ? -this.offset + 'px' : '0px'
                    });
                    
                    this._setStyles( this.scrollContainer, {
                        width: (this._calcSlideWidth() + this.offset) * this.slidesLength + 'px',
                        transform: `translateX(${this.currentScroll}px)`
                    });

                }, 500);
    
            };

        window.addEventListener('resize', handler);
    }
}
