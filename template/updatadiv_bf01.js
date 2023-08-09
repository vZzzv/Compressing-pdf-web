// 首页单个商品列表中的单个商品块
function updatabody() {

	return {
		props: {
			zindex: 0,
			zitem: "",
		},
		template: `
		<div class="ditem">
			<div style="padding: 10px;"><img src="./images/pdf.png" style="width: 50px;"></div>
			<div style="width:100%;padding: 10px; padding-left: 5px;">
				<div style="width: 100%;display: flex; justify-content: space-between;">
					<div class="ditem-title">{{name}}</div>
					<div style="width: 100px; text-align: right;">{{osize}}MB</div>
				</div>
				<div style="padding-top: 10px;width: 100%;display: flex; justify-content: space-between;">
					<div style="width: 35%; color: chocolate;">
						期望压缩到 {{size}} MB
					</div>
					<div  v-if ="!completeBoo" style="width: 20%;text-align: right;">
						{{stattitle}}
					</div> 
					<div v-if ="!completeBoo" style="width: 30%;padding: 7px; text-align: right;box-sizing: border-box;">
						<el-progress :percentage="percent" :show-text="false" ></el-progress>
					</div> 
					<div v-if ="!completeBoo" style="width: 15%;text-align: right;">
						{{percent}}%
					</div> 
					 <div v-if ="completeBoo" style="width: 65%; text-align: right;">
						 <el-button size="mini" type="primary" @click="download" >下载文件 {{completeSize}}MB</el-button>
					</div> 
				</div>
			</div>
			
			<el-popconfirm
			    width="220"
			    confirm-button-text="确定"
			    cancel-button-text="取消"
			    icon-color="#009978"
			    title="确定要删除这条数据吗？"
				@confirm="deleItemFun"
			  >
			    <template #reference>
				  <el-icon style="color: #ff0000;"><circle-close-filled /></el-icon>
			    </template>
			  </el-popconfirm>

		</div>
		`,
		data() {
			return {

				stattitle: "上传文件",
				visible: false,

				file: null,
				name: "",
				nameMd5: "",
				osize: 0,
				size: 0,
				userId: "",


				// 切片后的文件数据
				fileArr: [],
				// 是否开始上传文件
				updateBoo: false,
				// 上传文件的进度
				percent: 0,


				//OSS
				client: null,
				accessKeyId: "",
				accessKeySecret: "",
				securityToken: "",

				// 查询进度要用到的key
				progressKey: "",
				// 最后的压缩编号
				compressionNum: "",
				// 是否完成
				completeBoo: false,
				// 压缩最后的文件大小
				completeSize: 0

			};
		},

		mounted() {

			this.file = this.zitem.file
			this.nameMd5 = this.zitem.nameMd5

			this.size = this.zitem.size
			this.name = this.file.name
			this.userId = this.zitem.userId
			let ost = this.file.size / 1024 / 1024
			this.osize = Number(ost).toFixed(2)

			//文件切片
			// this.slicingFun(this.file.raw)


			//访问服务器是否是未上传完的数据
			//this.incompleteDataUploads()

			//上传到oss上
			this.getOSSToken()
		},
		methods: {

			//临时 上传文件的 token
			getOSSToken() {
				let url = _http + "getOSSToken";
				axios.get(url)
					.then((res) => {
						let tdata = res.data;
						console.log(tdata)
						if (tdata.accessKeyId.length > 0 && tdata.accessKeySecret.length > 0) {
							this.accessKeyId = tdata.accessKeyId
							this.accessKeySecret = tdata.accessKeySecret
							this.securityToken = tdata.securityToken
							
							this.existsOSS()
							
							return
						}
						this.$message.error("oss token 获取失败");
					})
					.catch((error) => {
						console.log(error);
						this.$message.error("网格异常上传失败");
					});
			},
			
			existsOSS(){
				let url = _http + "existsOSS";
				let config = {
					headers: {}
				};
				let param = new FormData(); //创建form对象
				param.append("name", this.nameMd5 + ".pdf");
				axios.post(url, param, config)
					.then((res) => {
						let tdata = res.data;
						
						
						if (tdata.code == 0) {
							let boo = tdata.data
							if(boo){
								// 服务器上有该文件
								this.percent = 100
								this.pdfCompression()
								return
							}
							this.putObject()
						}
					})
					.catch((error) => {
						// console.log(error);
						this.$message.error("网格异常上传失败");
					});
			},

			// 上传文件到 oss
			async putObject() {

				if (this.client == null) {
					this.client = new OSS({ // yourRegion填写Bucket所在地域。以华东1（杭州）为例，yourRegion填写为oss-cn-hangzhou。
						region: region,
						// 从STS服务获取的临时访问密钥（AccessKey ID和AccessKey Secret）。
						accessKeyId: this.accessKeyId,
						accessKeySecret: this.accessKeySecret,
						// 从STS服务获取的安全令牌（SecurityToken）。
						stsToken: this.securityToken,
						// 填写Bucket名称。
						bucket: bucket
					});
				}

				const headers = {
					"Content-Type": "multipart/form-data"
				};

				try {
					this.stattitle = "上传文件"
					const result = await this.client.multipartUpload("pdf/" + this.nameMd5 + ".pdf", this.file
					.raw, {
						progress: (p, cpt, res) => { //progress is generator

							this.percent = parseInt(p * 10000) / 100 // 进度
							// console.log(p);
							// console.log(cpt);
							// console.log(res);

						},
						// 设置并发上传的分片数量。
						parallel: 4,
						// 设置分片大小。默认值为1 MB，最小值为100 KB。
						partSize: 1024 * 1024 * 2,
					});
					// console.log(result);
					this.pdfCompression()
				} catch (e) {
					// console.log(e);
					this.$message.error("上传文件出错");
				}

			},
			// 开始压缩 pdf
			pdfCompression() {
				this.stattitle = "pdf压缩中"
				this.percent = 0

				// 通知服务，开始压缩 pdf
				let url = _http + "startCompressingPDF";
				let config = {
					headers: {}
				};
				let param = new FormData(); //创建form对象
				param.append("name", this.nameMd5 + ".pdf");
				param.append("compSize", this.size);
				axios.post(url, param, config)
					.then((res) => {
						let tdata = res.data;
						if (tdata.code == 0) {
							this.progressKey = tdata.data
							// console.log(this.progressKey)
							setTimeout(() => {
								this.progressFun()
							}, 500)
							return
						}
						this.$message.error(tdata.msg);
					})
					.catch((error) => {
						// console.log(error);
						this.$message.error("网格异常上传失败");
					});
			},
			// pdf 压缩进度
			progressFun() {
				let url = _http + "getCompProgress";
				let config = {
					headers: {}
				};
				let param = new FormData(); //创建form对象
				param.append("pkey", this.progressKey);
				axios.post(url, param, config)
					.then((res) => {
						let tdata = res.data;
						// console.log(tdata)
						if (tdata.code == 0) {
							let pdata = tdata.data
							let p = parseInt(pdata.state) / 10
							this.percent = parseInt(p * 10000) / 100 // 进度

							if (parseInt(pdata.state) >= 0 && parseInt(pdata.state) < 10) {
								setTimeout(() => {
									this.progressFun()
								}, 2000)
							} else if (parseInt(pdata.state) == 10) {
								this.compressionNum = pdata.data
								this.completeSize = Number(pdata.size).toFixed(2) // 位置2位小数
								this.complete()
							}else if (parseInt(pdata.state) < 0){
								this.$message.error(pdata.msg);
							}
							return
						}
						
						this.$message.error(tdata.msg);
					})
					.catch((error) => {
						// console.log(error);
						this.$message.error("网格异常上传失败");
					});
			},

			//压缩完成
			complete() {
				this.stattitle = ""
				this.completeBoo = true
			},

			// 下载文件
			download() {

				// 配置响应头实现通过URL访问时自动下载文件，并设置下载后的文件名。
				const filename = this.nameMd5 + "_" + this.compressionNum + '.pdf'
				const response = {
					'content-disposition': `attachment; filename=${encodeURIComponent(filename)}`
				}
				// 填写Object完整路径。Object完整路径中不能包含Bucket名称。
				const url = this.client.signatureUrl("pdf/" + filename, {
					response
				});

				let a = document.createElement('a')
				a.href = url
				a.click();

			},



			//删除本条数据
			deleItemFun() {
				// 如果正在上传，删除后停止上传
				this.updateBoo = false
				this.$emit("dele-item-fun", this.zindex);
				this.visible = false
			},





			///////===========================








			//开始上传
			upDataFun(key, index) {
				if (index >= this.fileArr.length) {
					return;
				}
				let url = _http + "private/uppdf";
				let config = {
					headers: {
						"Content-Type": "multipart/form-data"
					}
				};
				this.updateBoo = true;
				let param = new FormData(); //创建form对象
				param.append("state", 1);
				param.append("key", key);
				param.append("file", this.fileArr[index], "file.pdf");
				param.append("index", index);
				param.append("slicesNum", this.fileArr.length);
				param.append("compSize", this.size);
				param.append("userId", this.userId);
				axios.post(url, param, config)
					.then((res) => {
						let tdata = res.data;
						if (tdata.code == 0) {
							// 上传完成
							this.uploadComplete(tdata.data);
							return;
						} else if (tdata.code == 3) {
							//准备上传
							let it = index + 1;
							this.percent = parseInt((it / this.fileArr.length) * 10000) / 100 // 进度
							if (it < this.fileArr.length && this.updateBoo) {
								this.upDataFun(key, it);
							}
						}

					})
					.catch((error) => {
						this.updateBoo = false;
						console.log(error);
						this.$message.error("网格异常上传失败2");
					});
			},

			//上传完成
			uploadComplete(fileName) {
				this.updateBoo = false
				this.percent = 100;
				// console.log(fileName)
				// this.fileName = fileName
				// this.postData.videoUrl = url;
			},

			//文件切片
			slicingFun(file) {
				this.fileArr = [];
				let filesize = file.size;
				let bytesPerPiece = 1024 * 1024 * 2; // 每个文件切片大小定为2MB
				let start = 0;
				let end;
				while (start < filesize) {
					end = start + bytesPerPiece;
					if (end > filesize) {
						end = filesize;
					}
					let chunk = file.slice(start, end); //切割文件
					this.fileArr.push(chunk);
					start = end;
				}
			},

			//访问服务器是否是未上传完的数据
			incompleteDataUploads() {
				let config = {
					headers: {
						"Content-Type": "multipart/form-data"
					}
				};
				let url = _http + "private/uppdf"
				let param = new FormData(); //创建form对象
				param.append("state", 0);
				param.append("name", this.nameMd5);
				param.append("index", 0);
				param.append("slicesNum", this.fileArr.length);
				param.append("compSize", this.size);
				param.append("userId", this.userId);
				axios.post(url, param, config)
					.then(res => {
						this.updateBoo = false;
						let tdata = res.data;
						if (tdata.code == 0) {
							//上传完成
							this.uploadComplete(tdata.data);
							return;
						} else if (tdata.code == 2) {
							//准备上传
							this.percent = 0;
							this.upDataFun(tdata.key, tdata.index);
							return;
						}

						this.$message.error(tdata.msg);
					})
					.catch(error => {
						console.log(error)
					});

			},


		},
	}
}