Tasks = new Mongo.Collection("tasks");

if (Meteor.isServer) {
    //this code runs only on the server
    // only publish tasks taht are public or belong to current user
    Meteor.publish("tasks", function () {
        return Tasks.find({
            $or: [
                {private: {$ne: true}},
                {owner: this.userId}
            ]
        });
     });
}

if (Meteor.isClient) {
    //this code runs only on the client
    Meteor.subscribe("tasks");
    
    Template.body.helpers({
        tasks: function () {
            if (Session.get("hideCompleted")) {
                // if hide completed is checked, filter tasks
                return Tasks.find({checked: {$ne: true}}, {sort: {createdAt: -1}});
            } else {
                //otherwise return all tasks
            return Tasks.find({}, {sort: {createdAt: -1}});
            }
        },
        hideCompleted: function () {
            return Session.get("hideCompleted");
        },
        incompleteCount: function () {
            return Tasks.find({checked: {$ne: true}}).count();
        }
    });
    
    Template.body.events({
        "submit .new-task": function (event) {
            //prevent default browser form submit
            event.preventDefault();
            
            //get value from form element
            var text = event.target.text.value;
            
            //insert a task into the collection
            Meteor.call("addTask", text);
            
            //clear form
            event.target.text.value = "";
        },
        "change .hide-completed input": function (event) {
            Session.set("hideCompleted", event.target.checked);
        }
    });
    
    Template.task.helpers({
        isOwner: function () {
            return this.owner === Meteor.userId();
        }
    });
    
    Template.task.events({
        "click .toggle-checked": function() {
            //set the checked property to the opposite of its current value
            Meteor.call("setChecked", this._id, !this.checked);
        },
        "click .delete": function() {
            Meteor.call("deleteTask", this._id);
        },
        "click .toggle-private": function() {
            Meteor.all("setToPrivate", this._id, ! this.private);
        }
    });
    
    Accounts.ui.config({
        passwordSignupFields: "USERNAME_ONLY"
    });
}

Meteor.methods({
    addTask: function(text) {
        //make sure user is logged in before inserting a task
        if(!Meteor.userId()) {
            throw new Meteor.Error("not-authorized");
        }
        
        Tasks.insert({
            text: text,
            createdAt: new Date(),
            owner: Meteor.user().username
        });
    },
    deleteTask: function(taskId) {
        var task = Tasks.findOne(taskId);
        if(task.private && task.owner !== Meteor.userId()) {
            //if the task is private, make sure only the owner can delete it
            throw new Meteor.Error("not-authorized");
        }
        
        Tasks.remove(taskId);
    },
    setChecked: function(taskId, setChecked) {
        var task = Tasks.findOne(taskId)
            if (task.private && task.owner !== Meteor.userId()) {
                //if the task is private, make sure only the owner can check it off
                throw new Meteor.Error("not-authorized");
            }
        
        Tasks.update(taskId, { $set: { checked: setChecked}});
        
    },
    setPrivate: function(taskId, setToPrivate) {
        var task = Task.findOne(taskId);
        
        //make sure only the task owner can make task private
        if(task.owner !== Meteor.userId()) {
            throw new Meteor.Error("not-authorized");
        }
        
        Tasks.update(taskId, {$set: {private: setToPrivate}});
    } 
});