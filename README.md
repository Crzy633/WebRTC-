# WebRTC直播间

### 演示链接

[简单直播间 (parva.cool)](https://parva.cool/zbj/)

​           

### WebRTC介绍

[WebRTC中文网-最权威的RTC实时通信平台 |](https://webrtc.org.cn/)

​           

### 原理简单解释：

​	浏览器提供获取屏幕、音频等媒体数据的接口，

​	双方的媒体流数据通过Turn服务器传输。

​           

## 项目构造(非常简单)

前端：就一个html文件，js和css直接放里面了，纯手写，没有引入任何框架和工具

后端：Nodejs(包：express、http、ws)

​           

## 项目前提：需要搭建Turn服务器

WebRTC的建立借助于Turn服务器，用于交换双发的媒体协议信息等等。

但不要怕，跟着步骤走就搭建好了。

但是在win10上搭建比较繁琐，建议linux中搭建

[Window 搭建Turn服务器 - 简书 (jianshu.com)](https://www.jianshu.com/p/bd8cf753e87f)

[centos7 搭建turn stun 服务器_菜鸟逐梦-CSDN博客](https://blog.csdn.net/qq_32435729/article/details/78729093)

​           

## 项目启动

运行turn服务器，node运行server.js完事

​           

## WebRTC建立连接过程

1. **[加入者]**  点击加入房间
2. **[后端] ** 通知  **[房主]**
3. **[房主]**  创建一个`RTCPeerConnection`实例，然后发送"_offer"到  **[后端]**
4. **[后端]**转发"_offer"给**[加入者]**
5. **[加入者]**  创建一个`RTCPeerConnection`实例，然后反馈"_answer"到  **[后端]**
6. **[后端]**  转发"_answer"给  **[房主]**

在上述过程中，**[加入者]**和**[房主]**都会创建PC实例，创建过程即跟Turn服务器建立连接的过程，当双方都跟Turn服务器建立连接之后，Turn服务器会自动发送一个"ice_candidate"消息给**[房主]**，发生以下过程：

1. **[房主]**  的`RTCPeerConnection`接收来自Turn的"ice_candidate"消息，触发onicecandidate事件
2. **[房主]**  将"ice_candidate"消息发送到  **[后端]**
3. **[后端]**  转发"_ice_candidate"给  **[加入者]**
4. **[加入者]**  将"_ice_candidate"信息添加到自己的`RTCPeerConnection`实例里面