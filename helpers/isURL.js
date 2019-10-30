module.exports=(path)=>{
    const IS_URL = /^((http[s]?:)?\/\/)/;
	return IS_URL.test(path);
}