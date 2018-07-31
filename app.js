var express = require('express');
var app = express();
var fs = require('fs');
var extend = require('extend');
var uploadModel = require('./upload-model');

var async = require('async');
var events = require('events');
var cfenv = require('cfenv');
var formidable = require("formidable");
var eventEmitter = new events.EventEmitter();//event controller
var path = require('path');

var watson = require('watson-developer-cloud'),
    multer = require('multer');
var bodyParser = require('body-parser');
//app.use(bodyParser.json());

app.use(express.static(__dirname + '/public'));// serve the files out of ./public as our main files

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

app.listen(appEnv.port, '0.0.0.0', function() {// start server on the specified port and binding host
	// print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});

var uploading = multer({
    storage: multer.memoryStorage()
});

app.set('json spaces', 4);

var VisualRecognitionV3 = require('watson-developer-cloud/visual-recognition/v3'); // watson sdk
var uuid = require('uuid');
var im = require('imagemagick');

var os = require('os');
var gm=require('gm');
var imagemagick=gm.subClass({imageMagick: true});

var height=[];
var width=[];
var left = [];
var top=[];
var facenum;
var visualRecognition = new VisualRecognitionV3({
    version: '2018-03-19',
    iam_apikey: 'o8Wmq7OVK4T0EV-bguDbIRsYMzTWR51E2hqnCRWXM0gb'
  });

var images_file;

var params = {};
// var newfilepath;
// var oldfilepath="0";
app.get('/',function(req, res){
    res.render('public/index.html');
    res.send("hello world");
});
var extName;//上传文件扩展名

app.post('/upload', function (req, res) {
  //res.setHeader("Access-Control-Allow-Origin","*");
  uploadModel.uploadPhoto(req,'img',function(err,fields,uploadPath){
      if(err){
          return res.json({
              errCode : 0,
              errMsg : '上传图片错误'
          });
      }
      else{
        console.log(fields);    //表单中字段信息
        console.log(uploadPath);    //上传图片的相对路径

        // read file from 
        //读图片用IBM API
        var file = fs.createReadStream("./public"+uploadPath)
        params = {
          images_file: file//流式
        };
      

        // crop picture
        visualRecognition.detectFaces(params, function(err, detect_result) {
          if (err){
            console.log(err);
            return ;
          }
          else{
            console.log(JSON.stringify(detect_result, null, 2));
            var faces=detect_result.images[0].faces;
            facenum=detect_result.images[0].faces.length;
            var num=0;
            for(num=0;num<facenum;num++){
                height[num] = detect_result.images[0].faces[num].face_location.height;
                width[num] = detect_result.images[0].faces[num].face_location.width;
                left[num] = detect_result.images[0].faces[num].face_location.left;
                top[num] = detect_result.images[0].faces[num].face_location.top;
                extName = path.extname("./public"+uploadPath); 
                im.convert(["./public"+uploadPath,'-crop',String(height[num])+'x'+String(width[num]+5)+'+'+String(left[num])+'+'+String(top[num]),"./public/temp_img/output"+String(num)+extName],function(err, response) {
                    if (err){
                      console.log(err);
                      return ;
                    }
                });
            }
          }
        //detect end
        });
        return res.json({
              errCode : 1,
              errMsg : '上传成功',
              fields :  fields,
              uploadPath : uploadPath
        });
    //else end
      }
  //post end
  });
});

app.get('/classify',function(req,res){
    //res.setHeader("Access-Control-Allow-Origin","*");
    // detect mode
    var classify_mod_array = [];
    classify_mod_array.push("0");
    var classify_image_path= [];
    var order=[];
    var classifier_ids=["DefaultCustomModel_1449508052"];
    var threshold = 0;
    for(num=0;num<facenum;num++){
      images_file = fs.createReadStream("./public/temp_img/output"+String(num)+extName);
      classify_image_path.push("./temp_img/output"+String(num)+extName);
      var params2 = {
        images_file: images_file,
        classifier_ids: classifier_ids,
        threshold:threshold
      };
      
      //console.log("begin classify");
      visualRecognition.classify(params2, function(err, json_info) {
        if (err){
          console.log(err);
          return ;
        }
        else{
          //console.log(JSON.stringify(json_info, null, 2));
          var image_name=json_info.images[0].image;
          classify_mod_array.push(JSON.stringify(json_info, null, 2));
          order.push(image_name.split('.')[0].substring(6,7));
          if(classify_mod_array.length-1==facenum){
              return res.json({
                  errCode : 2,
                  errMsg : "识别成功",
                  facenum: facenum,
                  classify_mod_array: classify_mod_array,
                  classify_image_path: classify_image_path,
                  order: order,
                  height: height,
                  width: width ,
                  left: left,
                  top: top
              })
          }
        }
      });
      
    }
	if(facenum==0){
	        return res.json({
              errCode : 1,
              errMsg : '识别失败'
        });
	}
	});

app.post('/camera_upload',function(req,res){
  console.log("receive req");
  uploadModel.uploadPhoto(req,'img',function(err,fields,uploadPath){
    if(err){
      //console.log("upload fail");
      return res.json({
          errCode : 0,
          errMsg : '上传图片错误'
      });
    }
    else{
      console.log(fields);    //表单中字段信息
      console.log(uploadPath);    //上传图片的相对路径
      // read file from 
        //读图片用IBM API
        var file = fs.createReadStream("./public"+uploadPath)
        params = {
          images_file: file//流式
        };
      

        // crop picture
        visualRecognition.detectFaces(params, function(err, detect_result) {
          if (err){
            console.log(err);
            return ;
          }
          else{
            console.log(JSON.stringify(detect_result, null, 2));
            var faces=detect_result.images[0].faces;
            facenum=detect_result.images[0].faces.length;
            var num=0;
            for(num=0;num<facenum;num++){
                height[num] = detect_result.images[0].faces[num].face_location.height;
                width[num] = detect_result.images[0].faces[num].face_location.width;
                left[num] = detect_result.images[0].faces[num].face_location.left;
                top[num] = detect_result.images[0].faces[num].face_location.top;
                extName = path.extname("./public"+uploadPath); 
                im.convert(["./public"+uploadPath,'-crop',String(height[num])+'x'+String(width[num]+5)+'+'+String(left[num])+'+'+String(top[num]),"./public/temp_img/output"+String(num)+extName],function(err, response) {
                    if (err){
                      console.log(err);
                      return ;
                    }
                });
            }
          }
        //detect end
        });
        return res.json({
              errCode : 1,
              errMsg : '上传成功',
              fields :  fields,
              uploadPath : uploadPath
        });
    }
  });

});
// function fileOrBlobToDataURL(obj, cb){
// 	var a = new FileReader();
// 	a.readAsDataURL(obj);
// 	a.onload = function (e){
// 		cb(e.target.result);
// 	};
// }

// function blobToImage(blob, cb){
// 	fileOrBlobToDataURL(blob, function (dataurl){
// 		var img = new Image();
// 		img.src = dataurl;
// 		cb(img);
// 	});
// }