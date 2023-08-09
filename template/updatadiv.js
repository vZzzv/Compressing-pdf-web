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
						 <el-button size="small" type="primary" @click="download" >下载文件 {{completeSize}}MB</el-button>
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



				// 查询进度要用到的key
				progressKey: "",
				// 最后的压缩编号
				compressionNum: "",
				// 是否完成
				completeBoo: false,
				// 压缩最后的文件大小
				completeSize: 0,
				
				ossUploadId:"",
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
			this.slicingFun(this.file.raw)
			
			
			// ossh 
			this.existsOSS()

		},
		methods: {

		
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
								// oss上有该文件
								console.log("oss上有该文件")
								this.percent = 100
								this.pdfCompression()
								return
							}
							//  oss上没有该文件上传oss
							console.log("oss上没有该文件上传oss")
							this.incompleteDataUploads(null,0)
						}
					})
					.catch((error) => {
						// console.log(error);
						this.$message.error("网格异常上传失败");
					});
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
						
						if (tdata.code == 0) {
							let pdata = tdata.data
							let p = parseInt(pdata.state) / 10
							if(pdata.p2){
								let p2 = parseFloat(pdata.p2)
								p = p + p2/1000
							}
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
				
				let url = _http + "getLink";
				let config = {
					headers: {}
				};
			
				
				let param = new FormData(); //创建form对象
				param.append("name", this.nameMd5 + "_" + this.compressionNum + ".pdf");
				
				axios.post(url, param, config)
					.then((res) => {
						let tdata = res.data;
						console.log(tdata)
						if (tdata.code == 0) {
							let downUrl = tdata.data
							let a = document.createElement('a')
							a.href = downUrl
							a.click();
							return
						}
						this.$message.error(tdata.msg);
					})
					.catch((error) => {
						// console.log(error);
						this.$message.error("网格异常上传失败");
					});

			
			},



			//删除本条数据
			deleItemFun() {
				// 如果正在上传，删除后停止上传
				this.updateBoo = false
				this.$emit("dele-item-fun", this.zindex);
				this.visible = false
			},


			//////////////////////////////////////////////////////////////////////////////////////////////
			
			//文件切片
			slicingFun(file) {
				this.fileArr = [];
				let filesize = file.size;
				let bytesPerPiece = 1024 * 1024 * 1; // 每个文件切片大小定为1MB
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
			incompleteDataUploads(ossUploadId,index = 0) {
				
				
				
				let allsize = this.fileArr.length
				let config = {
					headers: {
						"Content-Type": "multipart/form-data"
					}
				};
				
				let url = _http + "/startOSSUpFile"
				
				url = _http + "/startOSSUpFile"
				
				let param = new FormData(); //创建form对象
				param.append("name", this.nameMd5);
				param.append("file", this.fileArr[index], "file.pdf");
				param.append("index", index);
				param.append("allSize", allsize);
				if(index > 0){
					param.append("ossUploadId", ossUploadId);
				}
				
				
				axios.post(url, param, config)
					.then(res => {
						this.updateBoo = false;
						let tdata = res.data;
						if (tdata.code == 0) {
							//上传完成
							this.ossUploadId = tdata.data
							this.percent = parseInt(index/allsize * 10000) / 100 // 进度
							
							if (index + 1 < this.fileArr.length){
								this.incompleteDataUploads(this.ossUploadId,index + 1)
							}else{
								this.percent = 100
								//上传完成 开始压缩
								this.pdfCompression()
							}
							return
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