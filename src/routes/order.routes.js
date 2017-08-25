var Router = require('restify-router').Router,
orderRouter = new Router(),
verifyToken = require('restify-jwt'),
tokenHelper = require('../helpers/token.helper.js'),
restify = require('restify');

var secret = process.env.JWT_SECRET;

//var grpc = require("grpc");
//var tableDescriptor = grpc.load(__dirname + '/../proto/table.proto').table;
//var tableClient = new tableDescriptor.TableService('service.table:1295', grpc.credentials.createInsecure());


orderRouter.get('/', function(req, res, next){
  var token = req.header('Authorization');
  tokenHelper.getTokenContent(token, secret, function(err, decodedToken){
    if(err){
      res.status(400);
      res.send(err);
      return;
    }

    var metadata = new grpc.Metadata();
    metadata.add('authorization', tokenHelper.getRawToken(token));
    tableClient.getAll({}, metadata, function(err, result){
      if(err){
        res.send(err)
      }else{
        res.send(result);
      }
    });
  });
});

orderRouter.post("/", verifyToken({secret:secret}), function(req,res,next){
  //create request
  //get user id in order to link new premises to user
  var token = req.header('Authorization');
  tokenHelper.getTokenContent(token, secret, function(err, decodedToken){
    if(err){
      res.status(400);
      res.send(err);
      return;
    }
    var tableToCreate = req.body;
    tableToCreate.owner = decodedToken.sub;
    tableClient.create(tableToCreate, function(err, result){
      if(err){
        res.status(400);
        res.send(err);
        return;
      }
      res.send(result);
    });
  });
});

orderRouter.put('/:_id', function(req, res, next){
  var token = req.header('Authorization');
  tokenHelper.getTokenContent(token, secret, function(err, decodedToken){
    if(err){
      res.status(400);
      res.send(err);
      return;
    }
    var metadata = new grpc.Metadata();
    metadata.add('authorization', tokenHelper.getRawToken(token));
    req.body._id = req.params._id;
    tableClient.update(req.body, metadata, function(err, result){
      if(err){
        res.status(400);
        res.send(err);
        return;
      }
      res.send(result);
    });
  });
});

orderRouter.del('/:_id', function(req, res, next){
  var token = req.header('Authorization');
  tokenHelper.getTokenContent(token, secret, function(err, decodedToken){
    if(err){
      res.status(400).send(err);
      return;
    }
    var metadata = new grpc.Metadata();
    metadata.add('authorization', tokenHelper.getRawToken(token));
    var body = {}
    body._id = req.params._id;
    tableClient.delete(body, metadata, function(err, result){
      if(err){
        res.status(400);
        res.send(err);
        return;
      }
      res.send();
    });
  });
});

module.exports = orderRouter;
