/**
 * Created by Administrator on 2016/9/26.
 */
var http = require("http");

var url = require("url");

var fs = require("fs");
//superagent是个轻量的的 http 方面的库，是nodejs里一个非常方便的客户端请求代理模块，
// 当我们需要进行 get 、 post 、 head 等网络请求时，尝试下它吧。
var superagent = require("superagent");
//cheerio大家可以理解成一个 Node.js 版的 jquery，用来从网页中以 css selector 取数据，使用方式跟 jquery 一样一样的。
var cheerio = require("cheerio");
//async是一个流程控制工具包，提供了直接而强大的异步功能mapLimit(arr, limit, iterator, callback)。
var async = require("async");
//eventproxy非常轻量的工具，但是能够带来一种事件式编程的思维变化。
var eventproxy = require("eventproxy");

var ep = new eventproxy();
var urlsArray = [];  //存放爬取的网址

var pageUrls = [];   //存放收集文章页面网址

var pageNum = 10;  //要爬取文章的页数

for (var i = 1; i <= pageNum; i++) {
    pageUrls.push('http://www.cnblogs.com/?CategoryId=808&CategoryType=%22SiteHome%22&ItemListActionName=%22PostList%22&PageIndex=' + i + '&ParentCategoryId=0');
}

//主程序

function start() {
    function onRequest(req, res) {
        //轮询所有文章列表页
        console.log("++++++++++++++++++++++++++++++轮询所有文章列表页+++++++++++++++++++++++++");
        pageUrls.forEach(function (pageUrl) {
            superagent.get(pageUrl).end(function (err, pers) {
                // pres.text 里面存储着请求返回的 html 内容，将它传给 cheerio.load 之后
                // 就可以得到一个实现了 jquery 接口的变量，我们习惯性地将它命名为 `$`
                // 剩下就都是利用$ 使用 jquery 的语法了
                var $ = cheerio.load(pers.text);
                //获取class=titlelnk的元素
                var curPageUrls = $('.titlelnk');
                //获取curPageUrls 里面的文章路径到urlsArray中
                for (var i = 0; i < curPageUrls.length; i++) {
                    var articleUrl = curPageUrls.eq(i).attr('href');
                    urlsArray.push(articleUrl);
                    //相当于一个计数器
                    ep.emit('BlogArticleHtml', articleUrl);
                }

            });
        });
        //
        ep.after('BlogArticleHtml', pageUrls.length * 20, function (articleUrls) {
            // 当所有 'BlogArticleHtml' 事件完成后的回调触发下面事件
            //控制并发数
            var curCount = 0;
            var reptileMove = function (url, callback) {
                //延迟毫秒数
                var delay = parseInt((Math.random() * 30000000) % 1000, 10);
                curCount++;
                //console.log('现在的并发数是', curCount, '，正在抓取的是', url, '，耗时' + delay + '毫秒');
                superagent.get(url).end(function (err, sres) {
                    // sres.text 里面存储着请求返回的 html 内容
                    var $ = cheerio.load(sres.text);
                    //收集数据
                    //拼接URL
                    var currentBlogApp = url.split('/p/')[0].split('/')[3];
                    var appUrl = "http://www.cnblogs.com/mvc/blog/news.aspx?blogApp=" + currentBlogApp;
                    //具体收集函数
                    personInfo(appUrl);
                });
                setTimeout(function () {
                    curCount--;
                    callback(null, url + "Call back content");
                }, delay);
            };

            // 使用async控制异步抓取
            // mapLimit(arr, limit, iterator, [callback])
            // 异步回调
            async.mapLimit(articleUrls, 5, function (url, callback) {
                reptileMove(url, callback);
            }, function (err, result) {
                //4000 个 URL 访问完成的回调函数

            });
        });
    }

    http.createServer(onRequest()).listen(3000);

    function personInfo(appUrl) {
        superagent.get(appUrl).end(function (err, sres) {
            //收集用户信息
            var $ = cheerio.load(sres.text);
            var profile_block = $("#profile_block a");
            var data = "昵称为：" + $(profile_block[0]).text() +
                "园龄为：" + $(profile_block[1]).text() +
                "粉丝数：" + $(profile_block[2]).text() +
                "关注数：" + $(profile_block[3]).text()+
                "\r\n";
            console.log("正在写入："+data);
            fs.appendFile('data.txt',data,'utf8', function (err) {
                if(err){
                    console.log(err);
                }
            });
        });
    }
}
exports.start = start;





















