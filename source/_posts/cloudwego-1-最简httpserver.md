---
title: cloudwego 1 最简httpserver
date: 2025-07-28 02:45:56
tags: [cloudwego,go]
---

# 1. 概述
cloudwego主要包含以下几部分
|          | language | usage           |
| -------- | -------- | --------------- |
| Kitex    | Go       | go RPC          |
| Hertz    | Go       | HTTP framework  |
| Netpoll  | Go       | Network library |
| Cwgo     | Go       | Code generation |
| Eino     | Go       | langchain       |
| Volo     | Rust     | rust RPC        |
| Monolake | Rust     | Network library |

本文使用hertz + cwgo实现一个最简的httpserver. 并打包成镜像上传到dockerhub.



# 2. 项目创建
### 2.1 按照官方文档安装好cwgo

```shell
go install github.com/cloudwego/cwgo@latest
```

### 2.2 创建项目目录

```shell
mkdir -p go-proj/svc go-proj/proto
cd go-proj
go work init . # 初始化workspace, 因为如果是一起开发微服务项目会包含多个modules, 并且需要共享rpc相关数据结构
```

### 2.3 proto文件定义

要用cwgo根据proto一键生成httpserver, 需要先创建hertz的api注解文件, 用于实现get/post/query/formdata等http概念的解析 (proto本身没有这个功能), 参见[文档](https://www.cloudwego.io/docs/cwgo/tutorials/server/example_pb/).
这里直接复制就行.
位置:`go-proj/proto/api.proto`
```protobuf
// 拷贝自hertz官方文档

// api.proto; 注解拓展
syntax = "proto2";
package api;
import "google/protobuf/descriptor.proto";
option go_package = "cwgo/http/api";
extend google.protobuf.FieldOptions {
    optional string raw_body = 50101;
    optional string query = 50102;
    optional string header = 50103;
    optional string cookie = 50104;
    optional string body = 50105;
    optional string path = 50106;
    optional string vd = 50107;
    optional string form = 50108;
    optional string js_conv = 50109;
    optional string file_name = 50110;
    optional string none = 50111;
    optional string form_compatible = 50131;
    optional string js_conv_compatible = 50132;
    optional string file_name_compatible = 50133;
    optional string none_compatible = 50134;
    optional string go_tag = 51001;
}

extend google.protobuf.MethodOptions {
    optional string get = 50201;
    optional string post = 50202;
    optional string put = 50203;
    optional string delete = 50204;
    optional string patch = 50205;
    optional string options = 50206;
    optional string head = 50207;
    optional string any = 50208;
    optional string gen_path = 50301;
    optional string api_version = 50302;
    optional string tag = 50303; 
    optional string name = 50304;
    optional string api_level = 50305; 
    optional string serializer = 50306;
    optional string param = 50307; 
    optional string baseurl = 50308; 
    optional string handler_path = 50309; 
    optional string handler_path_compatible = 50331; 
}

extend google.protobuf.EnumValueOptions {
    optional int32 http_code = 50401;
}

extend google.protobuf.ServiceOptions {
    optional string base_domain = 50402;
    optional string base_domain_compatible = 50731;
}

extend google.protobuf.MessageOptions {
    optional string reserve = 50830;
}
```


然后创建自己的proto文件. `go-proj/proto/http.proto`
```protobuf
syntax = "proto3";
package hello;
option go_package = "cwgo/http/hello";
import "api.proto";

message HelloReq {
   string Name = 1[(api.query)="name"];
}

message HelloResp {
   string RespBody = 1;
}

service HelloService {
   rpc Method1(HelloReq) returns(HelloResp) {
      option (api.get) = "/hello";
   }
}
```

# 3. 编译和运行
创建`go-proj/makefile`文件
```makefile
# 使用cwgo通过proto生成源代码
hello-server-src: proto/http.proto
	mkdir -p svc/hello-server
	cd svc/hello-server && \
	cwgo server \
		--type HTTP \
		--idl ../../proto/http.proto \
		--server_name simple-httpserver \
		--module quoilam/go-proj/hello-server


PHONY: clean
clean:
	rm -rf svc/hello-server
```

通过以下命令编译并运行
```shell
make hello-server-src
cd svc/hello-server
go get . # 安装依赖
go run .
```

如果正常运行你会看到输出
```
&{Env:test Hertz:{Service:simple-httpserver Address::8080 EnablePprof:true EnableGzip:true EnableAccessLog:true LogLevel:info LogFileName:log/hertz.log LogMaxSize:10 LogMaxBackups:50 LogMaxAge:3} MySQL:{DSN:gorm:gorm@tcp(127.0.0.1:3306)/gorm?charset=utf8mb4&parseTime=True&loc=Local} Redis:{Address:127.0.0.1:6379 Password: Username: DB:0}}
```

此时使用`curl`可以测试默认接口
```shell
curl -X GET localhost:8080/ping
```
输出
```
{"ping":"pong"}⏎  
```



# 4. 添加业务逻辑
个人对目录结构的理解: 
```
hello-server/
├── biz # buisness logic
│   ├── dal # data access layer 包括redis mysql等部分
│   ├── handler # request handler 解析请求参数
│   ├── router # 路由 middleware、gateway、lb在这里做
│   ├── service # 请求处理的具体业务逻辑, 也是proto定义的service的具体实现
│   └── utils
├── build.sh # 便捷build脚本
├── conf # 三种环境的配置文件
│   ├── conf.go
│   ├── dev
│   ├── online
│   └── test
├── docker-compose.yaml
├── go.mod
├── hertz_gen # hertz生成的proto代码, 一般需要客户端共享的数据结构定义
│   ├── cwgo
│   └── http.pb.go
├── main.go
├── readme.md
└── script
    └── bootstrap.sh # 便捷启动脚本
```

修改`go-proj/svc/hello-server/biz/server.go`

```go
...
func (h *Method1Service) Run(req *hertz_gen.HelloReq) (resp *hertz_gen.HelloResp, err error) {
	// 添加下列逻辑
	resp = &hertz_gen.HelloResp{
		RespBody: "Hello, " + req.GetName(),
	}
	return
}
```


运行, 并测试
```shell
go run .
# 另起终端
curl -X GET "localhost:8080/hello?name=world"
```
得到回复 `{"RespBody":"Hello, world"}`

# 5.打包镜像
创建`go-proj/deploy/dockerfile`
```dockerfile
FROM golang:1.23 as BUILD

WORKDIR /app
COPY go.sum go.mod /app/

ENV GO111MODULE=on
ENV GOPROXY=https://goproxy.cn

RUN go mod download

COPY . /app/
# 这里如果不disable CGO的话, 后面alpine里没有libc, 运行不了
RUN GOOS=linux CGO_ENABLED=0 ./build.sh

# -----------------
FROM alpine as RUN
WORKDIR /app

# 运行 bootstrap.sh 需要bash, 其实也可以不用脚本直接运行
RUN apk add bash 

COPY --from=BUILD /app/output /app
EXPOSE 8080

ENTRYPOINT ["/app/bootstrap.sh"]
```

在`goproj/makefile`中添加以下内容
```makefile
DOCKERHUB_ID := quoilam # 你的dockerhub用户名
image: hello-server-src
	docker build -f deploy/dockerfile -t hello-server svc/hello-server
	docker tag localhost/hello-server:latest ${DOCKERHUB_ID}/hello-server:v0.0.1
	docker push ${DOCKERHUB_ID}/hello-server:v0.0.1 
```

这里需要将`${DOCKERHUB_ID}`设置为dockerhub用户名, 并且需要本地配置一下`docker registry`然后执行`docker login`.
这里后续应该也会出博客记录一下docker打包镜像相关的内容.

运行`make image`即可打包镜像并上传到dockerhub.

{% asset_img image.png "dockerhub snapshot" %}
