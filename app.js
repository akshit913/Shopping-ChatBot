var express = require("express");
var app     = express();
var path    = require("path");
var bodyParser = require('body-parser');
var timOut=require("botbuilder-timeout");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
//global.sprice;
var sprice;
app.get('/',function(req,res){
  res.sendFile(path.join(__dirname+'/index.html'));
  //__dirname : It will resolve to your project folder.
});
var mongoose = require("mongoose");
mongoose.Promise = global.Promise;
mongoose.connect("mongodb://localhost:27017/node-demo");
var nameSchema = new mongoose.Schema({
    itemname: String,
    price: Number,
    quantity: Number
});
var User = mongoose.model("User", nameSchema);
app.post("/addItem", (req, res) => {
    var myData = new User(req.body);
    myData.save()
        .then(item => {
            res.send("Name saved to database");
        })
        .catch(err => {
            res.status(400).send("Unable to save to database");
        });
});
//chatbot begins
var restify = require('restify');
var builder = require('botbuilder');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());
var inMemoryStorage = new builder.MemoryBotStorage();
//var sprice;
var bot = new builder.UniversalBot(connector,[
	function(session){
		session.send("Welcome to the Market Place!!");
		builder.Prompts.text(session,"What do you want to buy?");
},
function(session,results){
	session.dialogData.itemName= results.response.toLowerCase();
	builder.Prompts.number(session,"what is the quantity?");
},
function(session,results){
	session.dialogData.quantityVal=results.response;
	//to get the price and calculate total price:
	getPrice(session.dialogData.itemName).then(data => {
		if(data==null){
			session.send(`Sorry!<br>${session.dialogData.itemName} is not available at our store!`);
			session.endDialog();
		}else{
  	console.log('File contents:', data);
  	var itemInfo=data.toObject();
  	var inventory=itemInfo.quantity;
  	console.log("inventory is:",inventory);
  	if(inventory-session.dialogData.quantityVal<0){
  		session.send(`Cannot process your request for ${session.dialogData.quantityVal}`);
  		session.send(`Only ${inventory} in stock`);
  		session.endDialog();
  	}else{
  	//console.log(inventory);
  	var newInventory=inventory-session.dialogData.quantityVal;
  	console.log(newInventory);
  	User.updateOne({
  		"quantity":inventory
  	},{
  		$set:{
  			"quantity":newInventory
  		}
  	},function(err,results){
  		console.log("1 field updated");
  	});
  	var totalPrice = itemInfo.price*session.dialogData.quantityVal;
	session.send(`Your total Price is ${totalPrice}`);
  	session.send(`Thanks for visiting us!`);
	session.send(`Your order details are: <br/>Item name: ${session.dialogData.itemName} <br/>Quantity: ${session.dialogData.quantityVal} `);
	session.endDialog();
	}}}).catch(err => {
  	console.error("Error reading file:", err);
	});
}
]).set('storage', inMemoryStorage); // Register in-memory storage;
function getPrice(itemNamev) {
  return new Promise((resolve, reject) => {
    User.findOne({itemname: itemNamev}, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}
var options = {
    PROMPT_IF_USER_IS_ACTIVE_MSG: "10% discount on Samsung Mobile Phones!<br>Click yes to continue shopping!",
    PROMPT_IF_USER_IS_ACTIVE_TIMEOUT_IN_MS: 10000
};
timOut.setConversationTimeout(bot,options);
app.listen(3000);
console.log("Running at Port 3000");