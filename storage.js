// storage.js - pequeno wrapper para localStorage usado pelo site
(function(global){
    const KEY_ROL = 'rol_values';
    const KEY_ROL_FLAG = 'rol_generated';

    function saveROL(arr){
        try{
            if(!Array.isArray(arr)) arr = [];
            localStorage.setItem(KEY_ROL, JSON.stringify(arr));
            localStorage.setItem(KEY_ROL_FLAG, '1');
            return true;
        }catch(e){
            console.warn('storage.saveROL erro', e);
            return false;
        }
    }

    function loadROL(){
        try{
            const gen = localStorage.getItem(KEY_ROL_FLAG);
            if(gen !== '1') return [];
            const raw = localStorage.getItem(KEY_ROL);
            if(!raw) return [];
            const arr = JSON.parse(raw);
            if(!Array.isArray(arr)) return [];
            return arr;
        }catch(e){
            console.warn('storage.loadROL erro', e);
            return [];
        }
    }

    function clearROL(){
        try{
            localStorage.removeItem(KEY_ROL);
            localStorage.removeItem(KEY_ROL_FLAG);
            return true;
        }catch(e){
            console.warn('storage.clearROL erro', e);
            return false;
        }
    }

    function setItem(key, value){
        try{ localStorage.setItem(key, value); return true; }catch(e){ console.warn('storage.setItem', e); return false; }
    }
    function getItem(key){
        try{ return localStorage.getItem(key); }catch(e){ console.warn('storage.getItem', e); return null; }
    }
    function removeItem(key){
        try{ localStorage.removeItem(key); return true; }catch(e){ console.warn('storage.removeItem', e); return false; }
    }

    global.storage = {
        saveROL, loadROL, clearROL,
        setItem, getItem, removeItem
    };
})(window);
