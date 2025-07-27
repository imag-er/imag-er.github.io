---
title: k8s初探 2 简单golang应用部署
date: 2025-07-27 09:28:00
tags: [k8s, cloudwego, go]
---

# 1.概述
本文基于 [cloudwego-1-最简httpserver](/2025/07/28/cloudwego-1-最简httpserver/) 所构建的项目继续开发.

如果没有做那个项目也没关系, 可以直接使用镜像`quoilam/hello-server:v0.0.2`,或者只需要自己起一个最简单的go http应用(using gin hertz etc.), 接受请求, 返回一个特定于当前进程的标识符即可, 打包成镜像. 伪代码如下: 
```go
func main() {
    rand.seed(time.Now())
    val := rand.Intn(10000000) // 尽量大一些, 以防碰撞
    http.HandleFunc("/", func(w Writer, r *Request) {
        r.Response.Write(val)
    })
}
```

# 2.编写程序
在原项目的基础上, 添加`/get_num`的路由

修改proto定义 `go-proj/proto/http.proto`
```protobuf
// ...
message GetNumReq {
}
message GetNumResp {
   int32 Num = 1;
}
service HelloService {
   // ... 原有method1代码
   rpc GetNum(GetNumReq) returns(GetNumResp) {
      option (api.get) = "/getnum";
   }
}
```

运行`make hello-server-src`生成代码模版

修改`go-proj/svc/hello-server/biz/service/get_num.go`

```go
import (
	"math/rand"
	"sync"
)
var (
	num int32
	once sync.Once
)
func InitNum() {
	once.Do(func() {
		num = rand.Int31n(100000000)
	})
}
func (h *GetNumService) Run(req *hertz_gen.GetNumReq) (resp *hertz_gen.GetNumResp, err error) {
	resp = &hertz_gen.GetNumResp{
		Num: num,
	}
	return
}
```

别忘了在`main.go`里初始化
```go
func main(){
    service.InitNum()
    // ...
}

```
这里写一个接口专门返回随机数的目的是后续使用k8s部署时能够区分出请求是由不同pod返回的

打包前 `go run .`允许一下看一下接口是否可用, 是否同一个instance返回的是同一个数字, 不同的instance是否返回不同数字.

然后修改一下makefile里的版本号为v0.0.2 
然后打包镜像 `make image`.


# 3.deployment定义
回到 [k8s初探-1-安装与启动集群](/2025/07/27/k8s初探-1-安装与启动集群/) 创建的环境里.


在宿主机上创建配置文件 `deployment.yaml`
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: go-app-deployment
  labels:
    app: go-app
spec:
  replicas: 5 # ReplicaSet大小为5
  # 官方文档的介绍:
  # ReplicaSet 的作用是维持在任何给定时间运行的一组稳定的副本 Pod。
  # 通常，你会定义一个 Deployment，并用这个 Deployment 自动管理 ReplicaSet。
  selector:
    matchLabels:
      app: go-app
  template:
    metadata:
      labels:
        app: go-app
    spec:
      containers:
      - name: go-app
        image: quoilam/hello-server:v0.0.2
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: go-app-service
spec:
  type: NodePort
  selector:
    app: go-app
  ports:
    - protocol: TCP
      port: 8080 # service暴露在集群内部的端口
      targetPort: 8080 # 要转发到的pod的端口
      nodePort: 31080 # nodeport 也就是向master容器暴露的端口, 也就是master:31080
```

同时记得要把物理机的8080端口映射到master容器的31080网络
```yaml
# master.yaml
k3s-master:
# ...
ports:
    - "8080:31080"
```

重启集群
```shell
./end.sh
./start.sh
```

# 4.部署

创建`deployment`对象:
```shell
kubectl create -f deployment.yaml
```

等待一会儿, 使用
```shell
kubectl get pod
```
查看pod的启动情况, 不出意外的话可以得到类似输出
```shell
NAME                                 READY   STATUS    RESTARTS   AGE
go-app-deployment-5c5cc8b5c8-t2865   1/1     Running   0          5m16s
go-app-deployment-5c5cc8b5c8-tj5n8   1/1     Running   0          5m16s
go-app-deployment-5c5cc8b5c8-6cp89   1/1     Running   0          5m16s
go-app-deployment-5c5cc8b5c8-hn9w7   1/1     Running   0          5m16s
go-app-deployment-5c5cc8b5c8-hwrpp   1/1     Running   0          5m16s
```

# 5.测试
多次使用命令`curl localhost:8080/getnum `
可以看到若干输出相同, 若干输出不同, 总共有五种可能

```shell
#!/path/to/fish
for i in (seq 1 2000)              
    curl -s localhost:8080/getnum | jq '.Num'
end | sort -n | uniq -c
```
我的输出如下 
```
出现次数   数字
  420   12209825
  378   50028689
  415   67288989
  402   74708114
  385   94576406
```

可以看到我们的请求还是比较均匀地被分配到了不同的pod上面