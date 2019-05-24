const utils = {
    q(el) {
        return document.querySelector( el )
    },

    qA(elems){
        return document.querySelectorAll( elems )
    },

    _getType(type) {
        return Object.prototype.toString.call(type).slice(8, -1);
    },

    _copyArray(array) {
        return array.map( el => {
            if ( this._getType( el ) === 'Object' ) {
                return this._copyObject( el );
            } else if ( this._getType( el ) === 'Array' ) {
                return this._copyArray( el );
            } else {
                return el;
            }
        });
    },

    _copyObject(obj) {
        const copyObj = {};

        for( let key in obj ){
            let
                type = this._getType( obj[ key ] );

            if ( type === 'Object' ) {
                copyObj[ key ] = this._copyObject( obj[ key ] );
            } else if( type === 'Array' ){
                copyObj[ key ] = this._copyArray( obj[ key ] );
            } else {
                copyObj[ key ] = obj[ key ];
            }
        }

        return copyObj;
    },

    _extend(obj1, obj2) {
        const resObj = {};

        let type = null;

        for( let key in obj1 ){
            if ( obj2[ key ] === undefined ) {

                type = this._getType( obj1[ key ] );

                if ( type === 'Object' ) {
                    resObj[ key ] = this._copyObject(obj1[ key ]);
                } else if ( type === 'Array' ) {
                    resObj[ key ] = this._copyArray(obj1[ key ]);
                } else {
                    resObj[ key ] = obj1[ key ];
                }

            } else {

                type = this._getType( obj2[ key ] );

                if ( type === 'Object' ) {
                    resObj[ key ] = this._copyObject(obj2[ key ]);
                } else if ( type === 'Array' ) {
                    resObj[ key ] = this._copyArray(obj2[ key ]);
                }  else {
                    resObj[ key ] = obj2[ key ];
                }

            }
        }
        return resObj;
    }
};

const
        q = utils.q,
        _extend = utils._extend;

export { q, _extend };