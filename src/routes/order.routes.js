var Router = require('restify-router').Router,
orderRouter = new Router(),
verifyToken = require('restify-jwt'),
tokenHelper = require('../helpers/token.helper.js'),
restify = require('restify'),
moment = require('moment');

var secret = process.env.JWT_SECRET;

var grpc = require("grpc");
var orderDescriptor = grpc.load(__dirname + '/../proto/order.proto').order;
var orderClient = new orderDescriptor.FulfilmentService('service.fulfilment:1295', grpc.credentials.createInsecure());


orderRouter.get('/pending', function(req, res, next){
  var token = req.header('Authorization');
  tokenHelper.getTokenContent(token, secret, function(err, decodedToken){
    if(err){
      res.status(400);
      res.send(err);
      return;
    }

    var metadata = new grpc.Metadata();
    metadata.add('authorization', tokenHelper.getRawToken(token));
    orderClient.getPending({}, metadata, function(err, result){
      if(err){
        res.send(err)
      }else{
        res.send(result);
      }
    });
  });
});

orderRouter.get('/complete', function(req, res, next){
  var token = req.header('Authorization');
  tokenHelper.getTokenContent(token, secret, function(err, decodedToken){
    if(err){
      res.status(400);
      res.send(err);
      return;
    }

    var metadata = new grpc.Metadata();
    metadata.add('authorization', tokenHelper.getRawToken(token));
    orderClient.getCompleted({}, metadata, function(err, result){
      if(err){
        res.send(err)
      }else{
        res.send(result);
      }
    });
  });
});

orderRouter.get('/complete/:year/:month/:day', function(req, res, next){
  if(req.params.year && req.params.month && req.params.day){
    var token = req.header('Authorization');
    tokenHelper.getTokenContent(token, secret, function(err, decodedToken){
      if(err){
        res.status(400);
        res.send(err);
        return;
      }

      var metadata = new grpc.Metadata();
      metadata.add('authorization', tokenHelper.getRawToken(token));
      orderClient.getCompletedByDay({year: req.params.year, month: req.params.month, day: req.params.day}, metadata, function(err, result){
        if(err){
          res.send(err)
        }else{
          res.send(result);
        }
      });
    });
  }else{
    res.status(400).send('Not all parameters were supplied');
  }
});

orderRouter.get('/complete/breakdown', function(req, res, next){
  var token = req.header('Authorization');
  tokenHelper.getTokenContent(token, secret, function(err, decodedToken){
    if(err){
      res.status(400);
      res.send(err);
      return;
    }

    var metadata = new grpc.Metadata();
    metadata.add('authorization', tokenHelper.getRawToken(token));
    orderClient.getOrderBreakdown({}, metadata, function(err, result){
      if(err){
        res.send(err)
      }else{
        res.send(result);
      }
    });
  });
});

orderRouter.get('/:_id', function(req, res, next){
  var token = req.header('Authorization');
  tokenHelper.getTokenContent(token, secret, function(err, decodedToken){
    if(err){
      res.status(400);
      res.send(err);
      return;
    }

    var metadata = new grpc.Metadata();
    metadata.add('authorization', tokenHelper.getRawToken(token));
    orderClient.get({_id: req.params._id}, metadata, function(err, result){
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
    var metadata = new grpc.Metadata();
    metadata.add('authorization', tokenHelper.getRawToken(token));
    var orderToCreate = req.body;
    orderToCreate.owner = decodedToken.sub;
    orderClient.create(orderToCreate, metadata, function(err, result){
      if(err){
        res.status(400);
        res.send(err);
        return;
      }
      res.send(result);
    });
  });
});

orderRouter.post("/complete/:id", verifyToken({secret:secret}), function(req,res,next){
  console.log("Yep we reached here");
  var token = req.header('Authorization');
  tokenHelper.getTokenContent(token, secret, function(err, decodedToken){
    if(err){
      res.status(400);
      res.send(err);
      return;
    }
    var metadata = new grpc.Metadata();
    metadata.add('authorization', tokenHelper.getRawToken(token));
    orderClient.capturePayment({order: req.params.id}, metadata, function(err, result){
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
  if(req.params._id){
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
      var fieldsToUpdate = [];
      for(var key in req.body){
        fieldsToUpdate[fieldsToUpdate.length] = key;
      }
      req.body.fieldsToUpdate = fieldsToUpdate;
      console.log("field to update " + fieldsToUpdate);
      orderClient.update(req.body, metadata, function(err, result){
        if(err){
          res.status(400);
          res.send(err);
          return;
        }
        res.send(result);
      });
    });
  }else{
    res.status(400).send("No ID supplied");
  }
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
    orderClient.delete(body, metadata, function(err, result){
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
