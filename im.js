(function( $ ){
	$.fn.im = function( options ) {
	    var defaults = {
	    	contactClass: "chat-contact",
		    onlineClass : "online",
		    awayClass : "away",
		    offlineClass : "offline",
		    busyClass : "busy",
		    overColor: "#DEE8F0",
		    /* if div is hidden will show after load */
		    jid: "",
		    password: "",
		    url:"localhost",
		    resource:"Chat",
		    beforeConnect : undefined,
		    afterConnect: undefined,
		    errorFunction: undefined,
		    chatClass: "chat-container",
		    chatListClass: "chat-list",
		    loadClass : "loading-chat",
		    defaultStatus: null,
		    /* helps to debug some error's */
		    debug: false,
		    contactList: [],
		    contactNameIndex: "from",
		    title: "New message",
		    defaultTitle: document.title,
		    /* save the messages sent and received */
		    afterMessage : undefined,
		    afterIq : undefined,
		    soundPath: "",
		    soundName: "pop",
		    minimizeZone: undefined,
		    emotions: [
		    	{
		    		emotion: /:\)/g,
		    		emotionClass: "smile"
		    	},
		    	{
		    		emotion: /:D/ig,
		    		emotionClass: "happy"
		    	},
		    	{
		    		emotion: /:p/ig,
		    		emotionClass: "tongue"
		    	},
		    	{
		    		emotion: /:\(/g,
		    		emotionClass: "sad"
		    	},
		    	{
		    		emotion: /:o/ig,
		    		emotionClass: "surprised"
		    	},
				{
		    		emotion: /\(l\)/ig,
		    		emotionClass: "heart"
		    	},	    			    
		    	{
		    		emotion: /\(y\)/ig,
		    		emotionClass: "thumb_up"
		    	},
		    	{
		    		emotion: /;\)/g,
		    		emotionClass: "wink"
		    	},
		    	{
		    		emotion: /\(n\)/ig,
		    		emotionClass: "thumb_down"
		    	}
		    ],
		    addContact : true
	  	};

  		var settings = {},
		connection_options = {};

	  	settings = $.extend( {}, defaults, options );	  	

	  	var $container = this,
  		$parent = $(this).parent(),
  		$container_body = $("<div/>"),
  		statusClasses = settings.onlineClass + " " + settings.awayClass + " " + settings.busyClass + " " + settings.offlineClass,
		t = null,
		user = settings.username;//settings.jid.split("@")[0],
		contacts = [];

  		prepare($container, user);

		var $container_list = $container.find("ul:first").addClass(settings.chatListClass);
		var alfabetic = function(){};

		generateContacts($container_list);

		$.contextMenu({
	        selector: '.chat-title.chat-me .chat-status.'+settings.onlineClass+
	        ",.chat-title.chat-me .chat-status."+settings.busyClass+
	        ",.chat-title.chat-me .chat-status."+settings.awayClass+
	        ",.chat-title.chat-me .chat-status."+settings.offlineClass,
	        className: 'chat-status-context-menu',
	        trigger: 'left',
	        autoHide: true,
	        items: {
	            "online": {name: "Online", icon: settings.onlineClass, callback: function(key, opt){ 
	            	$.xmpp.setPresence({show:null}); 
	            	$(opt.selector).removeClass(statusClasses).addClass(settings.onlineClass); 
	            }},
	            "busy": {name: "Busy", icon: settings.busyClass, callback: function(key, opt){ 
	            	$.xmpp.setPresence({show:"dnd"}); 
	            	$(opt.selector).removeClass(statusClasses).addClass(settings.busyClass); 
	            }},
	            "away": {name: "Away", icon: settings.awayClass, callback: function(key, opt){
	            	$.xmpp.setPresence({show: "away"}); 
	            	$(opt.selector).removeClass(statusClasses).addClass(settings.awayClass); 
	            }},
	            "offline": {name: "Offline", icon: settings.offlineClass, callback: function(key, opt){
	            	$.xmpp.setPresence({show:"unavailable"}); 
	            	$(opt.selector).removeClass(statusClasses).addClass(settings.offlineClass); 
	            }},
	            "sep1": "---------",
	            "quit": {name: "Quit", icon: "quit", callback: function(key, opt){
	            	$.xmpp.disconnect();
	            }}
	        }
	    });

		$.contextMenu({
	        selector: '.'+settings.chatListClass+' .'+settings.contactClass,
	        className: 'chat-contact-context-menu',
	        autoHide: true,
	        items: {
	            "authorize": {name: "Authorize", icon: "question", callback: function(key, opt){ 
	            	//contacts[$(this).attr('id')] = user data
	            	authorize(contacts[$(this).attr('id')], null);
	            }},
	            "block": {name: "Block", icon: "block", callback: function(key, opt){ 
	            	//contacts[$(this).attr('id')] = user data
	            	authorize(contacts[$(this).attr('id')], "unavailable");	            	
	            }},
	            "update": {name: "Update", icon: "edit", callback: function(key, opt){ 
	            	//contacts[$(this).attr('id')] = user data
	            	addContact(null, contacts[$(this).attr('id')],$(this));
	            }},
	            "delete": {name: "Delete", icon: "delete", callback: function(key, opt){ 
	            	$.xmpp.deleteContact({to:contacts[$(this).attr('id')]['jid']});
	            	$(this).remove();
	            }}
	        }
	    });

		if(settings.debug)
			debug("Executing beforeConnect()");
		/* if need to do something before connect */
		if(typeof(settings.beforeConnect) === "function")
			settings.beforeConnect();

		if(settings.debug)
			debug("Executed beforeConnect()");

		/* Conection with xmpp */
		if($.xmpp){
			if(settings.debug)
				debug("Connecting to xmpp");
			connection_options = {
				"resource":settings.resource, "username":settings.username, "password":settings.password, "url":settings.url, "domain" : settings.domain,				
				onDisconnect:function(){
					destroy($container_list,$container);
					if(settings.debug)
						debug("Disconnected");
				},
				onConnect: function(eas){
					if(settings.debug)
						debug("Connected to xmpp");

					$.xmpp.getRoster();
					$.xmpp.setPresence(settings.defaultStatus);
					$container.find("."+settings.loadClass).removeClass(settings.loadClass);					

					var statusClass = 
						settings.defaultStatus ? 
							( settings.defaultStatus === "offline" ? 
								settings.offlineClass : (settings.defaultStatus === "dnd" ? 
									settings.busyClass : settings.awayClass)) 
						: settings.onlineClass;

					$(".chat-conversation-dialog textarea").removeAttr("disabled");
					$container.find(".chat-status").addClass(statusClass);

					/* if need to do something after connect */ 
					if(settings.debug)
						debug("Executing afterConnect()");
					if(typeof(settings.afterConnect) === "function")
						settings.afterConnect();
					if(settings.debug)
						debug("Executed afterConnect()");
				},
				onIq: function(iq){
					if(settings.debug)
						debug(iq);
					var from = $(iq).find("own-message").attr("to");
					from = from.match(/^[\w\W][^\/]+[^\/]/g)[0];
					var id = MD5.hexdigest(from);
					var conversation = $("#"+id+"_chat");
					if(conversation.length == 0){
						conversation = openChat({title: contacts[id]['from'], from:from, id: id+"_chat", md5_id:id});
						conversation.parent().find(".ui-dialog-titlebar").prepend($("#"+id).find(".chat-status").clone().removeClass("chatting"));
					}else{
						conversation.wijdialog("open");
					}
					var conversation_box = conversation.find(".chat-conversation-box");
					var date = "<span style='font-size:9px;'>("+(new Date().toString("HH:mm"))+")</span>";

					$("<div/>")
					.addClass("chat-conversation-box-me")
					.html(date+"<strong> Me: </strong>"+formatters($(iq).find("div").html()))
					.appendTo(conversation_box);
					conversation_box.scrollTo("div:last");
					conversation_box.next().html("");
				},
				onMessage: function(message){
					if(settings.debug)
						debug(message);
					message.from = message.from.match(/^[\w\W][^\/]+[^\/]/g)[0];
					var jid = message.from.split("/");
					var id = MD5.hexdigest(message.from);
					var conversation = $("#"+id+"_chat");
					if(message.body){
						if(conversation.length == 0){
							conversation = openChat({title: (contacts[id] ? contacts[id]['from']:message.from) , from:message.from, id: id+"_chat", md5_id:id});

							var status = $("#"+id).find(".chat-status").clone().removeClass("chatting");

							if(!status.length){
								status = $("<div/>")
								.addClass("chat-status")
								.addClass(settings.offlineClass);
							}

							conversation.parent().find(".ui-dialog-titlebar").prepend(status);
						}else{
							conversation.wijdialog("open");
						}
					}
					var conversation_box = conversation.find(".chat-conversation-box");
					var date = "<span style='font-size:9px;'>("+(new Date().toString("HH:mm"))+")</span>";

					if(message.body){
						$("<div/>")
						.addClass("chat-conversation-box-you")
						.html(date+"<strong> "+(contacts[id] ? contacts[id]['from']:message.from)+": </strong>"+formatters(message.body))
						.appendTo(conversation_box);
						conversation_box.scrollTo("div:last").next().html("");
						conversation.parent().find(".ui-dialog-titlebar").addClass("new");
						document.title = settings.title;
						document.getElementById("new_message_sound").play();

						noty({
							text: '<strong>'+contacts[id]['from']+' say:</strong><br/>'+(message.body.length > 20 ? message.body.substr(0,17)+"..." : message.body), 
							type: 'warning',
							timeout: 3000,
							layout: 'bottomRight',
							callback: {
								onCloseClick: function(e) {
									console.log(e);
									$("#"+id).click();
								}
							}
						});
					}
					if(settings.afterMessage)
						afterMessage(message);		
				},
				onPresence: function(presence){
					if(settings.debug)
						debug(presence);

					presence.from = presence.from.match(/^[\w\W][^\/]+[^\/]/g)[0];
					var md5_contact = MD5.hexdigest(presence.from);
					var select = $("#"+md5_contact);
					var statusClass = 
						presence['show'] !== "available" ? 
							( presence['show'] === "unavailable" ? 
								settings.offlineClass : (presence['show'] === "dnd" ? 
									settings.busyClass : (presence['show'] === "away"?
									settings.awayClass : settings.onlineClass))) 
						: settings.onlineClass;
					var from = presence.from.split("@")[0];
					var dialogs = $("#"+md5_contact+"_chat");
					if(select.length){
						select.find('.chat-contact-description')
						.html(presence['status'] ? " ("+presence['status']+") " : "");

						select.find("div.chat-status")
						.removeClass(statusClasses)
						.addClass(statusClass);
						if(dialogs.length){
							$("#"+md5_contact).addClass("chatting");
							dialogs.parent().find("div.chat-status")
							.removeClass(statusClasses)
							.addClass(statusClass);
						}
					}
					if(statusClass == settings.onlineClass){
						noty({
							text: '<strong>'+contacts[md5_contact]['from']+'</strong><br/>is online now', 
							type: 'success',
							timeout: 3000,
							layout: 'bottomRight',
							callback: {
								onCloseClick: function(e) {
									console.log(e);
									$(select).click();
								}
							}
						});
					}
					clearTimeout(alfabetic);
					alfabetic = setTimeout(function(){
						$container_list.find("li").tsort("."+settings.onlineClass, "span.chat-contact-name",{charOrder:"a[����]c[�]e[����]i[����]o[����]u[����]"});
						$container_list.find("li").tsort("."+settings.busyClass, "span.chat-contact-name",{charOrder:"a[����]c[�]e[����]i[����]o[����]u[����]"});
						$container_list.find("li").tsort("."+settings.awayClass, "span.chat-contact-name",{charOrder:"a[����]c[�]e[����]i[����]o[����]u[����]"});
						$container_list.find("li").tsort("."+settings.offlineClass, "span.chat-contact-name",{charOrder:"a[����]c[�]e[����]i[����]o[����]u[����]"});
						//$container.unblock();
					},1000);
				},
				onError: function(error){
					if(settings.debug)
						debug(error);
					if(settings.errorFunction)
						settings.errorFunction(error);

					destroy($container_list,$container);
				},
   				onComposing: function(message)
   				{
   					message.from = message.from.match(/^[\w\W][^\/]+[^\/]/g)[0];
					var id = MD5.hexdigest(message.from);
					var conversation = $("#"+id+"_chat");
					if(conversation.length){
						var conversation_box = conversation.find(".chat-conversation-box").next();
						var date = (new Date().toString("HH:mm"));
						switch(message.state){
							case 'active':
								conversation_box.html("").html("<span class='read-icon'></span>Seen "+date);
								break;
							case 'composing':
								conversation_box.html("").html("<span class='composing'></span>"+contacts[id]['from']+" is typing...");
								break;
							case 'gone':
								conversation_box.html("").html("<span class='active'></span>Gone "+date);
								break;
							case 'paused':
								conversation_box.html("").html("<span class='paused'></span>"+contacts[id]['from']+" stopped typing...");
								break;
							default:
								conversation_box.html("");
						}
					}
   					if(settings.debug)
						debug(message);
   				},
   				onRoster: function( roster)
   				{  			
   					if(settings.debug)
						debug(roster);		

					var _rosterJid = roster.jid;
					_rosterJid = _rosterJid.match(/^[\w\W][^\/]+[^\/]/g)[0]; 
   					
   					var md5_contact = MD5.hexdigest(_rosterJid);
					var select = $("#"+md5_contact);
					var from = roster['name'] ? roster['name'] : _rosterJid;

					contacts[md5_contact] = roster;
					contacts[md5_contact]['from'] = from;

					if(!select.length){
						//select.find(".chat-contact-name").html(from);
	   					var contact = $("<li/>")
						.attr("title", "Click to start a conversation with "+from)
						.attr("id", md5_contact)
						.addClass(settings.contactClass);
						
						var status = $("<div/>")
						.addClass("chat-status")
						.addClass(settings.offlineClass)
						.appendTo(contact);

						$("<span/>")
						.addClass("chat-contact-name")
						.html(from)
						.appendTo(contact);

						$("<span/>")
						.addClass("chat-contact-description")
						//.html(from)
						.appendTo(contact);

						contact.click(function(){
							var id = md5_contact+"_chat";
							var conversation = $("#"+id);
							if(conversation.length == 0){
								conversationDialog = openChat({"title":from, "from": _rosterJid, "id": id, "md5_id":md5_contact});
								conversationDialog.parent().find(".ui-dialog-titlebar").prepend(status.clone().removeClass("chatting"));
							}
							else{
								conversation.wijdialog("restore");
								conversation.wijdialog("open");
							}
						});
						$container_list.append(contact);	

						// Presence automatic
						if( $.trim(roster.subscription) == "from" ){
							// console.log(contacts[md5_contact] );//contacts[$(this).attr('id')]
							// console.log(_rosterJid + " -- " + roster.subscription );
							authorize(contacts[md5_contact], null);
						}

					}else{
						select.find(".chat-contact-name").html(from);
					}
   				}
		    };

		  	$.xmpp.connect(connection_options);
		}else{
			if(settings.debug)
				debug("xmpp plugin not found");
		}

		/* if the list of the users are pre-defined */
	  	function prepare(container, user){
	  		if(settings.debug)
					debug("Preparing");

			/*container.block({ 
                message: '<h3>Please Wait</h3>'
            });*/

			var div = $("<div/>")
			.addClass("chat-title chat-me")
			.appendTo(container);

			$("<span/>")
			.addClass("chat-name")
			.html(user.length > 25 ? user.substr(0,25)+"..." : user)
			.appendTo(div);

			if(settings.addContact){
				var addSpan = $("<span/>")
				.addClass("chat-add")
				.appendTo(div)
				.attr("title", "Add Contact")
				.click(addContact);	
			}			

			var text = "";
			$("<input/>")
			.addClass('chat-description-input')
			.attr({type: 'text', placeholder: 'Double click to edit', readonly: "readonly", title: "Double click to edit"})
			.wijtextbox()
			.dblclick(function(){
				if( $.xmpp.isConnected() ){
					text = $(this).val();
					$(this).removeAttr("readonly");
				}
			})
			.keydown(function(e){
				if(e.which == $.ui.keyCode.ENTER && !e.shiftKey){
					if($.trim($(this).val()) != ""){
						$.xmpp.setPresence({status: $(this).val()});
						text = $(this).val();
					}
					$(this).attr("readonly", "readonly");
				}else if(e.which == $.ui.keyCode.ESCAPE){
					$(this).val(text);					
					$(this).attr("readonly", "readonly");
				}
			})
			.focusout(function(){
				$(this).val(text);					
				$(this).attr("readonly", "readonly");		
			})
			.appendTo(div);

			$("<span/>")
			.addClass("chat-status")
			.addClass(settings.loadClass)
			.appendTo(div);		

			$("<div/>")
			.addClass("chat-list-title")
			.html("Contact list")
			.appendTo(container);

			var search_box = $("<input/>")
			.addClass("chat-search-input")
			.attr("placeholder", "Type your search")
			.keydown(function(e){
				if(e.which == $.ui.keyCode.ENTER && !e.shiftKey){
					$(this).parent().find("ul").toggle();
				}
			});

			$("<div/>")
			.addClass("chat-list")
			.addClass(settings.chatClass)
			.addClass(settings.loadClass)
			.append()
			.append("<ul/>")
			.append("<ul class='chat-search-result' style='display:none;'/>")
			.appendTo(container);

			if (!settings.minimizeZone) {
				$("<div/>")
				.addClass("footer-conversation-bar")
				.attr("id", "conversation-bar-container")
				.appendTo("body");
			}
			
	  		if(settings.debug)
					debug("Prepared");
	  	}

	  	function addContact(e, data, select){
	  		if(!$.xmpp.isConnected())
	  			return false;
	  		//MD5.hexdigest
	  		var offset;
	  		if(!select){
	  			offset = $(this).offset();
	  		}else{
	  			offset = $(select).offset()
	  		}
	  		
			var div = $("<div/>")
			.addClass("chat-add-contact");

			$("<span>")
			.html("Name: ")
			.appendTo(div);

			$("<input type='text'>")
			.attr({name: 'name', placeholder: 'Enter a name'})
			.appendTo(div)
			.val(data ? data.name : "");

			$("<br/>")
			.appendTo(div);

			$("<span>")
			.html("E-mail: ")
			.appendTo(div);

			var emailAttrs = {name: 'to', placeholder: 'Enter a valid e-mail'};
			if(data){
				emailAttrs['disabled'] = "disabled";
			}

			$("<input type='text'>")
			.attr(emailAttrs)
			.appendTo(div)
			.val(data ? data.jid : "");

			$(div).find("input").wijtextbox();

			var _data = data;
			div.wijdialog({
				autoOpen: true,
				title: data ? 'Edit Contact' : 'Add Contact',
				draggable: true,
				dialogClass: "add-contact-dialog",
				captionButtons: {
	                pin: { visible: false },
	                refresh: { visible: false },
	                toggle: { visible: false },
	                minimize: { visible: false },
	                maximize: { visible: false }
			    },
			    resizable: false,
				position: [offset.left,offset.top],
				buttons: [
					{
						text: data ? "Edit" : "Add", 
						click: function(){
							if(!_data){
								var data = {};
								$.each($(this).find("input"), function(e, q){
									data[$(q).attr("name")] = $(q).val();
								});
								data['type'] = "subscribe";
								$.xmpp.addContact(data);
								$.xmpp.subscription(data);
							}else{
								_data = $.extend( {}, _data, {name: $(this).find("input:first").val()} );
								$.xmpp.updateContact(_data);
							}
							$(this).wijdialog("close");	
						}
					},
					{
						text:"Cancel", 
						click: function(){
							$(this).wijdialog("close");
						}	
					}
				],
				close: function(){
					$(this).wijdialog ("destroy");
				}
			});
			//.appendTo("body");	
	  	}

		function authorize(data, subscription){
	  		var _subscription = ""
	  		
	  		if( subscription == "unavailable"){
	  			_subscription = subscription;
	  		}else{
		  		if( data.subscription = "none" ){
		  			_subscription = "subscribe";
		  		}
		
		  		if( data.subscription == "from" ){
		  			_subscription = "subscribe";
		  		}
	  		}
	  		$.xmpp.subscription({"to":data.jid, "type":_subscription});
	  	}

	  	function generateContacts(container_list){
	  		if(settings.contactList.length){
	  			for(var contact in settings.contactList)
					contactListChanges(contact,container_list);
	  		}
	  	}

	  	function contactListChanges(presence, selector){

	  		if(settings.debug)
				debug("Generating contact in the list");
			var md5_contact = MD5.hexdigest(presence[settings.contactNameIndex]);
			var select = $("#"+md5_contact);
			var statusClass = settings.offlineClass;
			var from = presence[settings.contactNameIndex].split("@")[0];

			if(!select.length){
				var contact = $("<li/>")
				.attr("title", "Click to start a conversation with "+from)
				.attr("id", md5_contact)
				.addClass(settings.contactClass)
				
				$("<div/>")
				.addClass("chat-status")
				.addClass(statusClass).appendTo(contact);

				$("<span/>")
				.addClass("chat-contact-name")
				.html(from)
				.appendTo(contact);

				contact.click(function(){
					var id = md5_contact+"_chat";
					var conversation = $("#"+id);
					if(conversation.length == 0){
						conversationDialog = openChat({title:from, from: presence[settings.contactNameIndex], id: id, md5_id:md5_contact});
						conversationDialog.parent().find(".ui-dialog-titlebar").prepend(status.clone().removeClass("chatting"));
					}
					else{
						conversation.wijdialog("restore");
						conversation.wijdialog("show");
					}
				});
				selector.append(contact);
			}
			if(settings.debug)
				debug("Generated contact in the list");
	  	}

	  	function openChat(options){
	  		if($.fn.wijdialog){
	  			if(settings.debug)
					debug("Generating Dialog to "+ options.title);
	  			var div = $("<div/>")
	  			.addClass("chat-conversation")
	  			.attr({"id" : options.id, title: options.title})
	  			.append("<div class='chat-conversation-box'/>")
	  			.append("<div class='chat-composing-box'/>");


	  			var pauseTimeOut;
	  			var composingTimeOut = true;

	  			var textarea = $("<textarea/>")
	  			.attr("placeholder", "Write your message here ...")
	  			.addClass("chat-conversation-textarea")
	  			.appendTo(div)
	  			.keydown(function(e){
	  				//set a timer
	  				$(this).parents(".ui-dialog").find(".ui-dialog-titlebar").removeClass("new");
	  				if(composingTimeOut){
	  					$.xmpp.isWriting({isWriting : 'composing', to:options.from});
	  					composingTimeOut = false;
	  				}
	  				if(e.which == $.ui.keyCode.ENTER && !e.shiftKey){
	  					var message = textarea.val();
	  					textarea.val("");
	  					e.preventDefault();
	  					if(settings.debug)
							debug("Sending message: "+message+"\nfrom: "+options.from);
	  					$.xmpp.sendMessage({body: message, to:options.from, resource:"Chat", otherAttr:"value"},
	   						"<error>An error has ocurred</error>");

	  					var conversation_box = div.find(".chat-conversation-box");
						var date = "<span style='font-size:9px;'>("+(new Date().toString("HH:mm"))+")</span>";

						$("<div/>")
						.addClass("chat-conversation-box-me")
						.html(date+"<strong> Me: </strong>"+formatters(message))
						.appendTo(conversation_box);
						conversation_box.scrollTo("div:last");
						conversation_box.next().html("");

						//$.xmpp.isWriting({isWriting : 'active', to:options.from});
						composingTimeOut = true;
						clearTimeout(pauseTimeOut);
						return;	
	  				}
	  				clearTimeout(pauseTimeOut);
	  				pauseTimeOut = setTimeout(function(){
	  					if(textarea.val() != "")
	  						$.xmpp.isWriting({isWriting : 'paused', to:options.from});
	  					else
	  						$.xmpp.isWriting({isWriting : 'inactive', to:options.from});
	  					composingTimeOut = true;
	  				},5000);

	  			})/*.focus(function(){
	  				//$(this).parents(".chat-conversation-dialog").parent().find(".ui-dialog-titlebar").removeClass("new");
	  				//$.xmpp.isWriting({isWriting : 'active', to:options.from});
	  			}).focusout(function(){
	  				//$.xmpp.isWriting({isWriting : 'inactive', to:options.from});
	  			})*/;

	  			$(div).append('<audio controls id="new_message_sound" style="display:none;"><source src="'+settings.soundPath+settings.soundName+'.mp3" type="audio/mpeg"/><source src="'+settings.soundPath+settings.soundName+'.ogg" type="audio/ogg"/></audio>');
	  			var status = $("#"+options.md5_id).find(".chat-status");

	  			if(settings.debug)
					debug("Generated Dialog to "+ options.title);

	  			return div.wijdialog({ 
	                autoOpen: true, 
	                captionButtons: { 
	                    refresh: { visible: false },
	                    maximize: {visible: false}
	                },
	                dialogClass: "chat-conversation-dialog",
	                resizable:false,
	                minimizeZoneElementId: (!settings.minimizeZone ? "conversation-bar-container" : settings.minimizeZone),
	                open: function (e) {
	                	status
	                	.addClass("chatting");
	                },
	                close: function (e) {
	                	status
	                	.removeClass("chatting");
	                	$.xmpp.isWriting({isWriting : 'gone', to:options.from});
	                },
	                focus: function(e){
	                	
	                	$(this).find("textarea").focus().click();
	                	document.title = settings.defaultTitle;
	                	if($(this).parent().find(".ui-dialog-titlebar").hasClass("new")){
	                		$(this).parent().find(".ui-dialog-titlebar").removeClass("new");
		                	clearTimeout(pauseTimeOut);
		  					$.xmpp.isWriting({isWriting : 'active', to:options.from});
	  					}
	                	
	                },
	                blur: function(e){
	                	pauseTimeOut = setTimeout(function(){
		  					$.xmpp.isWriting({isWriting : 'inactive', to:options.from});
		  					//composingTimeOut = true;
	  					},3000);
	                }
	            }); 
	  		}else{
	  			if(settings.debug)
	  				debug("wijmo not found");
	  		}
	  	}

	  	function destroy(containerList, container){
	  		var reconnectButton = container.find(".chat-status");
	  		statusClasses = settings.onlineClass + " " + settings.awayClass + " " + settings.busyClass + " " + settings.offlineClass;
	  		containerList.empty();
	  		var reconnect = function(e){
	  			reconnectButton.unbind('click', reconnect).addClass("chat-status loading-chat");
	  			// $container.block({ 
	     //            message: '<h3>Please Wait</h3>'
	     //        });
	  			e.preventDefault();
	  			$.xmpp.connect(connection_options);
	  		}
	  		//$container.unblock();
	  		reconnectButton.removeClass(statusClasses).removeClass("chat-status loading-chat").addClass("retry").click(reconnect);
	  		$(".chat-conversation-dialog textarea").attr("disabled", "disabled");
	  	}

		function debug( $obj ) {
		    if ( window.console && window.console.log ) {
		      window.console.log( $obj );
		    }
	  	};

	  	function formatters(text){
	  		var copy=text;
	  		copy = linkify(copy,{callback: function(text,href){
	  			return href ? '<a style="color:blue;" href="' + href + '" title="' + href + '" target="_blank">' + text + '</a>' : text;
	  		}});
	  		if(settings.emotions){
		  		for(var i in settings.emotions){
		  			copy = copy.replace(settings.emotions[i].emotion, "<span class='emotion "+settings.emotions[i].emotionClass+"'/>");	
		  		}
	  		}
	  		return copy;
	  	}

	  	return this.each(function() {
			if(settings.debug)
				debug(this);
	  	});
  	};

  	

}( jQuery ));
