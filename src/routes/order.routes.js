var Router = require('restify-router').Router,
orderRouter = new Router(),
verifyToken = require('restify-jwt-community'),
tokenHelper = require('../helpers/token.helper.js'),
restify = require('restify'),
moment = require('moment');

var secret = process.env.JWT_SECRET;

var grpc = require("grpc");
var orderDescriptor = grpc.load(__dirname + '/../proto/order.proto').order;
var orderClient = new orderDescriptor.FulfilmentService('service.fulfilment:1295', grpc.credentials.createInsecure());


orderRouter.get('/pending', verifyToken({secret:secret}), function(req, res, next){
  var token = req.header('Authorization');
  console.log('Received Request');
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

orderRouter.get('/complete', verifyToken({secret:secret}), function(req, res, next){
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

orderRouter.get('/complete/:year/:month/:day', verifyToken({secret:secret}), function(req, res, next){
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

orderRouter.get('/complete/breakdown', verifyToken({secret:secret}), function(req, res, next){
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

orderRouter.get('/statistics', verifyToken({secret:secret}), function(req, res, next){
  var token = req.header('Authorization');
  tokenHelper.getTokenContent(token, secret, function(err, decodedToken){
    if(err){
      res.status(400);
      res.send(err);
      return;
    }

    var metadata = new grpc.Metadata();
    metadata.add('authorization', tokenHelper.getRawToken(token));
    orderClient.getStatistics({}, metadata, function(err, result){
      if(err){
        res.status(err.code || 500);
        res.send(err.message);
      }else{
        res.send(result);
      }
    });
  });
});

orderRouter.get('/:_id', verifyToken({secret: secret}), function(req, res, next){
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
        res.status(err.code || 500);
        res.send(err);
        return;
      }
      res.send(result);
    });
  });
});

orderRouter.post("/refunded", function(req, res, next){
  //order charge has been refunded. So we need to tell the payment service that its been refunded
  //and then update the order in the fulfillment service
  if(req.body && req.body.type == 'charge.refunded'){
    orderClient.wasRefunded({charge_id: req.body.data.object.id}, (err, response) => {
      if(err){
        res.status(500);
        res.send();
      }
      res.status(200);
      res.send(response);
    })
  }else{
    res.send({acknowledged: false});
  }
})

orderRouter.post("/complete/:id", verifyToken({secret:secret}), function(req,res,next){
  var token = req.header('Authorization');
  tokenHelper.getTokenContent(token, secret, function(err, decodedToken){
    if(err){
      res.status(400);
      res.send(err);
      return;
    }
    var metadata = new grpc.Metadata();
    metadata.add('authorization', tokenHelper.getRawToken(token));
    orderClient.complete({order: req.params.id}, metadata, function(err, result){
      if(err){
        res.status(err.code || 500);
        console.log(err.metadata.get('error_code'));
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

orderRouter.post('/cancel/:_id', (req,res,next)=>{
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
    orderClient.cancel(body, metadata, function(err, result){
      if(err){
        res.status(400);
        console.log('name',err.name);
        console.log('messsage',err.message);
        res.send(err);
        return;
      }
      res.send();
    });
  });
});

module.exports = orderRouter;
