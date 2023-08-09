
let _http = "http://127.0.0.1:8100/";
let version = "v1.0.1"



function getUserId(){
	let uid = GetUser()
	if(uid == null || uid==undefined || uid.length <= 0){
		let ttime = parseInt(new Date().getTime() / 1000)-1680000000
		let sign = parseInt(Math.random()*90000+10000) 
		let id = ttime + "-" + sign
		SetUser(id)
		return id;
	}
	return uid;
}


///用户
function SetUser(strdata = "") {
	window.localStorage["z-user"] = strdata;
}
///读取 名称
function GetUser() {
	return window.localStorage["z-user"];
}



// 计算文件的md5
function getPdfMD5(file, callBack) {
    /*
     *     file 选取的文件
     *     callBack 回调函数可以返回获取的MD5
     */

    // 计算md5
    let fileReader = new FileReader()
    let blobSlice = File.prototype.mozSlice || File.prototype.webkitSlice || File.prototype.slice
    let chunkSize = 2097152
    // read in chunks of 2MB  
    let chunks = Math.ceil(file.size / chunkSize)
    let currentChunk = 0
    let spark = new SparkMD5();
    fileReader.onload = function (e) {
        spark.appendBinary(e.target.result); // append binary string  
        currentChunk++;
        if (currentChunk < chunks) {
            loadNext();
        } else {
            callBack(spark.end());
        }
    };

    function loadNext() {
        let start = currentChunk * chunkSize
        let end = start + chunkSize >= file.size ? file.size : start + chunkSize;
        fileReader.readAsBinaryString(blobSlice.call(file, start, end));
    };
    loadNext();
};
