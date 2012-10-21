var DEF_LATITUDE = 0.0;
var DEF_LONGITUDE = 0.0;
var curDB;
var curModeDone;
var intent = window.webkitIntent;
var ev_out;

/**
	uid
	url
	start
	end
	location
	latitude
	longitude
	title
	summary
	description
	orgcn
	orgemail
	orgphone
*/
function createEvent(uid, url, start, end, location, latitude, longitude,
	title, summary, description, userid, orgcn, orgemail, orgphone) {
	var event = new Object();
	event.uid = uid?uid:new Date().getTime() + '@' + (window.location.href.replace(/^[^\/]*\/\/([^\/]*)\/.*$/, '$1') || 'localhost') + '\n'; 
	event.url = url?url:'http://localhost/';
	event.title = title?title:'';
	event.start = start?start:new Date();
	event.end = end?end:start;
	event.summary = summary?summary:'';
	event.description = description?description:'';
	event.location = location?location:'';
	event.latitude = latitude?latitude:DEF_LATITUDE;
	event.longitude = longitude?longitude:DEF_LONGITUDE;
	event.userid = userid?userid:'';
	event.orgcn = orgcn?orgcn:"";
	event.orgemail = orgemail?orgemail:"";
	event.orgphone = orgphone?orgphone:"";

	event.ICSAccept = function () {
 		var limit75 = function(text) {
			var out = '';
			while (text.length > 75) {
				out += text.substr(0, 75) + '\n';
				text = ' ' + text.substr(75);
			}
			out += text;
			return out;
		};
		return 'BEGIN:VCALENDAR\n' +
			'VERSION:2.0\n' +
			'PRODID:commandus.js.icalendar\n' +
			'METHOD: REPLY\n' +
			'BEGIN:VEVENT\n' +
			'UID:' + event.uid + '\n' +
			'DTSTAMP:' + $.icalendar.formatDateTime(new Date()) + '\n' +
			'ATTENDEE;MEMBER=MAILTO:' + event.email + ';PARTSTAT=ACCEPTED;\n' +
			(event.url ? limit75('URL:' + event.url) + '\n' : '') +
			limit75('TITLE:' + event.title) + '\n' +
			'DTSTART:' + $.icalendar.formatDateTime(event.start) + '\n' +
			'DTEND:' + $.icalendar.formatDateTime(event.end) + '\n' +
			'GEO:' + formatGeo(event.latitude) + ';' + formatGeo(event.longitude) + '\n' +
			(event.summary ? limit75('SUMMARY:' + event.summary) + '\n' : '') +
			(event.description ? limit75('DESCRIPTION:' + event.description) + '\n' : '') +
			(event.location ? limit75('LOCATION:' + event.location) + '\n' : '') +
			((event.orgcn || event.orgemail || event.orgphone) ? limit75('ORGANIZER;CN="' + event.orgcn + '":MAILTO:' + event.orgemail + ':TEL:' + event.orgphone) + '\n' : '') +
			(event.orgphone ? limit75('TEL:' + event.orgphone  + '\n'):'') +
			(event.userid ? limit75('USERID:' + event.userid  + '\n'):'') +
			'END:VEVENT\n' +
			'END:VCALENDAR';
	}
	return event;
}

var icalParser={
	ical:{
		version:'',
		prodid:'',
		events:[],
		todos:[],
		journals:[],
		freebusys:[]
	},
	parseIcal: function(icsString){
		this.ical.version=this.getValue('VERSION',icsString);
		this.ical.prodid=this.getValue('PRODID',icsString);
		icsString=icsString.replace(/\r\n /g,'');
		
		var reg=/BEGIN:VEVENT(\r?\n[^B].*)+/g;
		var matches=icsString.match(reg);
		if(matches){
			for(i=0;i<matches.length;i++){
				//console.log(matches[i]);
				this.parseVevent(matches[i]);
			}
		}
		reg=/BEGIN:VTODO(\r?\n[^B].*)+/g;
		matches=icsString.match(reg);
		if(matches){
			for(i=0;i<matches.length;i++){
				//console.log('TODO=>'+matches[i]);
				this.parseVtodo(matches[i]);
			}
		}
		reg=/BEGIN:VJOURNAL(\r?\n[^B].*)+/g;
		matches=icsString.match(reg);
		if(matches){
			for(i=0;i<matches.length;i++){
				//console.log('JOURNAL=>'+matches[i]);
				this.parseVjournal(matches[i]);
			}
		}
		reg=/BEGIN:VFREEBUSY(\r?\n[^B].*)+/g;
		matches=icsString.match(reg);
		if(matches){
			for(i=0;i<matches.length;i++){
				//console.log('FREEBUSY=>'+matches[i]);
				this.parseVfreebusy(matches[i]);
			}
		}
		//console.log('parsed');
	},
	parseVfreebusy: function(vfreeString){
		////PROCHAINE VERSION: Generer seul les proprietes trouvees : + rapide
		var freebusy={
			contact:this.getValue('CONTACT',vfreeString), //
			dtstart:this.getValue('DTSTART',vfreeString), //This property specifies when the calendar component begins.
			dtend:this.getValue('DTEND',vfreeString), //This property specifies when the calendar component ends.
			duration:this.getValue('DURATION',vfreeString), //
			description:this.getValue('DESCRIPTION',vfreeString), //This property provides a more complete description of the calendar component, than that provided by the "SUMMARY" property.
			dtstamp:this.getValue('DTSTAMP',vfreeString), //The property indicates the date/time that the instance of the iCalendar object was created.
			organizer:this.getValue('ORGANIZER',vfreeString), //The property defines the organizer for a calendar component.
			uid:this.getValue('UID',vfreeString), //This property defines the persistent, globally unique identifier for the calendar component.
			url:this.getValue('URL',vfreeString), //This property defines a Uniform Resource Locator (URL) associated with the iCalendar object.

			attendee:this.getValue('ATTENDEE',vfreeString,true), //The property defines an "Attendee" within a calendar component.
			comment:this.getValue('COMMENT',vfreeString,true), //This property specifies non-processing information intended to provide a comment to the calendar user.			
			freebusy:this.getValue('FREEBUSY',vfreeString,true), //The property defines one or more free or busy time intervals.
			rstatus:this.getValue('REQUEST-STATUS',vfreeString,true), //This property defines the status code returned for a scheduling request.			
			xprop:this.getValue('X-',vfreeString,true), //
		};
		this.ical.freebusys[this.ical.freebusys.length]=freebusy;
	},
	parseVjournal: function(vjournalString){
		////PROCHAINE VERSION: Generer seul les proprietes trouvees : + rapide
		var journal={
			klass:this.getValue('CLASS',vjournalString), //This property defines the access classification for a calendar component.
			created:this.getValue('CREATED',vjournalString), //This property specifies the date and time that the calendar information was created by the calendar user agent in the calendar store.
			description:this.getValue('DESCRIPTION',vjournalString), //This property provides a more complete description of the calendar component, than that provided by the "SUMMARY" property.
			dtstart:this.getValue('DTSTART',veventString), //This property specifies when the calendar component begins.
			dtstamp:this.getValue('DTSTAMP',vjournalString), //The property indicates the date/time that the instance of the iCalendar object was created.
			lastmod:this.getValue('LAST-MODIFIED',vjournalString), //The property specifies the date and time that the information associated with the calendar component was last revised in the calendar store.
			organizer:this.getValue('ORGANIZER',vjournalString), //The property defines the organizer for a calendar component.
			recurid:this.getValue('RECURRENCE-ID',vjournalString), //This property is used in conjunction with the "UID" and "SEQUENCE" property to identify a specific instance of a recurring "VEVENT", "VTODO" or "VJOURNAL" calendar component. The property value is the effective value of the "DTSTART" property of the recurrence instance.
			seq:this.getValue('SEQUENCE',vjournalString), //This property defines the revision sequence number of the calendar component within a sequence of revisions.
			status:this.getValue('STATUS',vjournalString), //This property defines the overall status or confirmation for the calendar component.
			summary:this.getValue('SUMMARY',vjournalString), //This property defines a short summary or subject for the calendar component.
			uid:this.getValue('UID',vjournalString), //This property defines the persistent, globally unique identifier for the calendar component.
			url:this.getValue('URL',vjournalString), //This property defines a Uniform Resource Locator (URL) associated with the iCalendar object.

			attach:this.getValue('ATTACH',vjournalString,true), //The property provides the capability to associate a document object with a calendar component.
			attendee:this.getValue('ATTENDEE',vjournalString,true), //The property defines an "Attendee" within a calendar component.
			categories:this.getValue('CATEGORIES',vjournalString,true), //This property defines the categories for a calendar component.
			comment:this.getValue('COMMENT',vjournalString,true), //This property specifies non-processing information intended to provide a comment to the calendar user.			
			contact:this.getValue('CONTACT',vjournalString,true), //The property is used to represent contact information or alternately a reference to contact information associated with the calendar component.
			exdate:this.getValue('EXDATE',vjournalString,true), //This property defines the list of date/time exceptions for a recurring calendar component.
			exrule:this.getValue('EXRULE',vjournalString,true), //This property defines a rule or repeating pattern for an exception to a recurrence set.
			related:this.getValue('RELATED',vjournalString,true), //To specify the relationship of the alarm trigger with respect to the start or end of the calendar component.
			rdate:this.getValue('RDATE',vjournalString,true), //This property defines the list of date/times for a recurrence set.
			rrule:this.getValue('RRULE',vjournalString,true), //This property defines a rule or repeating pattern for recurring events, to-dos, or time zone definitions.
			rstatus:this.getValue('REQUEST-STATUS',vjournalString,true), //This property defines the status code returned for a scheduling request.			
			xprop:this.getValue('X-',vjournalString,true), //
		};
		this.ical.journals[this.ical.journals.length]=journal;
	},
	parseVtodo: function(vtodoString){
		////PROCHAINE VERSION: Generer seul les proprietes trouvees : + rapide
		var todo={
			klass:this.getValue('CLASS',vtodoString), //This property defines the access classification for a calendar component.
			completed:this.getValue('COMPLETED',vtodoString), //This property defines the date and time that a to-do was actually completed.
			created:this.getValue('CREATED',vtodoString), //This property specifies the date and time that the calendar information was created by the calendar user agent in the calendar store.
			description:this.getValue('DESCRIPTION',vtodoString), //This property provides a more complete description of the calendar component, than that provided by the "SUMMARY" property.
			dtstamp:this.getValue('DTSTAMP',vtodoString), //The property indicates the date/time that the instance of the iCalendar object was created.
			geo:this.getValue('GEO',vtodoString), //This property specifies information related to the global position for the activity specified by a calendar component.
			lastmod:this.getValue('LAST-MODIFIED',vtodoString), //The property specifies the date and time that the information associated with the calendar component was last revised in the calendar store.
			location:this.getValue('LOCATION',vtodoString), //The property defines the intended venue for the activity defined by a calendar component.
			organizer:this.getValue('ORGANIZER',vtodoString), //The property defines the organizer for a calendar component.
			percent:this.getValue('PERCENT-COMPLETE',vtodoString), //This property is used by an assignee or delegatee of a to-do to convey the percent completion of a to-do to the Organizer.
			priority:this.getValue('PRIORITY',vtodoString), //The property defines the relative priority for a calendar component.
			recurid:this.getValue('RECURRENCE-ID',vtodoString), //This property is used in conjunction with the "UID" and "SEQUENCE" property to identify a specific instance of a recurring "VEVENT", "VTODO" or "VJOURNAL" calendar component. The property value is the effective value of the "DTSTART" property of the recurrence instance.
			seq:this.getValue('SEQUENCE',vtodoString), //This property defines the revision sequence number of the calendar component within a sequence of revisions.
			status:this.getValue('STATUS',vtodoString), //This property defines the overall status or confirmation for the calendar component.
			summary:this.getValue('SUMMARY',vtodoString), //This property defines a short summary or subject for the calendar component.
			uid:this.getValue('UID',vtodoString), //This property defines the persistent, globally unique identifier for the calendar component.
			url:this.getValue('URL',vtodoString), //This property defines a Uniform Resource Locator (URL) associated with the iCalendar object.

			due:this.getValue('DUE',vtodoString), //This property defines the date and time that a to-do is expected to be completed.
			duration:this.getValue('DURATION',vtodoString), //The property specifies a positive duration of time.

			attach:this.getValue('ATTACH',vtodoString,true), //The property provides the capability to associate a document object with a calendar component.
			attendee:this.getValue('ATTENDEE',vtodoString,true), //The property defines an "Attendee" within a calendar component.
			categories:this.getValue('CATEGORIES',vtodoString,true), //This property defines the categories for a calendar component.
			comment:this.getValue('COMMENT',vtodoString,true), //This property specifies non-processing information intended to provide a comment to the calendar user.			
			contact:this.getValue('CONTACT',vtodoString,true), //The property is used to represent contact information or alternately a reference to contact information associated with the calendar component.
			exdate:this.getValue('EXDATE',vtodoString,true), //This property defines the list of date/time exceptions for a recurring calendar component.
			exrule:this.getValue('EXRULE',vtodoString,true), //This property defines a rule or repeating pattern for an exception to a recurrence set.
			rstatus:this.getValue('REQUEST-STATUS',vtodoString,true), //This property defines the status code returned for a scheduling request.			
			related:this.getValue('RELATED',vtodoString,true), //To specify the relationship of the alarm trigger with respect to the start or end of the calendar component.
			resources:this.getValue('RESOURCES',vtodoString,true), //This property defines the equipment or resources anticipated for an activity specified by a calendar entity..
			rdate:this.getValue('RDATE',vtodoString,true), //This property defines the list of date/times for a recurrence set.
			rrule:this.getValue('RRULE',vtodoString,true), //This property defines a rule or repeating pattern for recurring events, to-dos, or time zone definitions.
			xprop:this.getValue('X-',vtodoString,true), //
		};
		this.ical.todos[this.ical.todos.length]=todo;
	},
	parseVevent: function(veventString){
		////PROCHAINE VERSION: Generer seul les proprietes trouvees : + rapide
		var event={
			klass:this.getValue('CLASS',veventString), //This property defines the access classification for a calendar component.
			created:this.getValue('CREATED',veventString), //This property specifies the date and time that the calendar information was created by the calendar user agent in the calendar store.
			description:this.getValue('DESCRIPTION',veventString), //This property provides a more complete description of the calendar component, than that provided by the "SUMMARY" property.
			geo:this.getValue('GEO',veventString), //This property specifies information related to the global position for the activity specified by a calendar component.
			lastmod:this.getValue('LAST-MODIFIED',veventString), //The property specifies the date and time that the information associated with the calendar component was last revised in the calendar store.
			location:this.getValue('LOCATION',veventString), //The property defines the intended venue for the activity defined by a calendar component.
			organizer:this.getValue('ORGANIZER',veventString), //The property defines the organizer for a calendar component.
			priority:this.getValue('PRIORITY',veventString), //The property defines the relative priority for a calendar component.
			dtstamp:this.getValue('DTSTAMP',veventString), //The property indicates the date/time that the instance of the iCalendar object was created.
			seq:this.getValue('SEQUENCE',veventString), //This property defines the revision sequence number of the calendar component within a sequence of revisions.
			status:this.getValue('STATUS',veventString), //This property defines the overall status or confirmation for the calendar component.
			transp:this.getValue('TRANSP',veventString), //This property defines whether an event is transparent or not to busy time searches.
			url:this.getValue('URL',veventString), //This property defines a Uniform Resource Locator (URL) associated with the iCalendar object.
			recurid:this.getValue('RECURRENCE-ID',veventString), //This property is used in conjunction with the "UID" and "SEQUENCE" property to identify a specific instance of a recurring "VEVENT", "VTODO" or "VJOURNAL" calendar component. The property value is the effective value of the "DTSTART" property of the recurrence instance.
			duration:this.getValue('DURATION',veventString), //The property specifies a positive duration of time.
			attach:this.getValue('ATTACH',veventString,true), //The property provides the capability to associate a document object with a calendar component.
			attendee:this.getValue('ATTENDEE',veventString,true), //The property defines an "Attendee" within a calendar component.
			categories:this.getValue('CATEGORIES',veventString,true), //This property defines the categories for a calendar component.
			comment:this.getValue('COMMENT',veventString,true), //This property specifies non-processing information intended to provide a comment to the calendar user.			
			contact:this.getValue('CONTACT',veventString,true), //The property is used to represent contact information or alternately a reference to contact information associated with the calendar component.
			exdate:this.getValue('EXDATE',veventString,true), //This property defines the list of date/time exceptions for a recurring calendar component.
			exrule:this.getValue('EXRULE',veventString,true), //This property defines a rule or repeating pattern for an exception to a recurrence set.
			rstatus:this.getValue('REQUEST-STATUS',veventString,true), //This property defines the status code returned for a scheduling request.			
			related:this.getValue('RELATED',veventString,true), //To specify the relationship of the alarm trigger with respect to the start or end of the calendar component.
			resources:this.getValue('RESOURCES',veventString,true), //This property defines the equipment or resources anticipated for an activity specified by a calendar entity..
			rdate:this.getValue('RDATE',veventString,true), //This property defines the list of date/times for a recurrence set.
			rrule:this.getValue('RRULE',veventString,true), //This property defines a rule or repeating pattern for recurring events, to-dos, or time zone definitions.
			xprop:this.getValue('X-',veventString,true), //
			uid:this.getValue('UID',veventString), //This property defines the persistent, globally unique identifier for the calendar component.
			summary:this.getValue('SUMMARY',veventString), //This property defines a short summary or subject for the calendar component.
			title:this.getValue('TITLE',veventString), // ?!!
			tel:this.getValue('TEL',veventString), // ?!!
			userid:this.getValue('USERID',veventString), // ?!!
			dtstart:this.getValue('DTSTART',veventString), //This property specifies when the calendar component begins.
			dtend:this.getValue('DTEND',veventString) //This property specifies the date and time that a calendar component ends.
		};
		this.ical.events[this.ical.events.length]=event;
	},
	getValue: function(propName,txt,multiple){
		if(multiple){
			eval('var matches=txt.match(/\\n'+propName+'[^:]*/g)');
			var props=[];
			if(matches){
				for(l=0;l<matches.length;l++){
					matches[l]=matches[l].replace(/:.*/,'');
					//on enleve les parametres 
					props[props.length]=this.getValue(matches[l],txt);
				}
				// console.log(props);
				return props;
			}
		}else{
			propName=propName.replace(/^\s+/g,'').replace(/\s+$/g,'');
			//console.log('('+propName.replace(/;(.*)/,')(;.*')+')');
			var reg=new RegExp('('+(propName.indexOf(';')?propName.replace(/;(.*)/,')(;.*'):propName)+')((?:;[^=]*=[^;:\n]*)*):([^\n\r]*)','g');
			var matches=reg.exec(txt);
			if(matches){ //on a trouve la propriete cherchee
				//console.log('params='+RegExp.$2+' / valeur='+RegExp.$3);
				var valeur=RegExp.$3;
				var tab_params={};
				if(RegExp.$2.length>0){ //il y a des parametres associes
					var params=RegExp.$2.substr(1).split(';');
					var pair;
					for(k=0;k<params.length;k++){
						pair=params[k].split('=');
						if(!pair[1]) pair[1]=pair[0];
						tab_params[pair[0]] = pair[1];
					}
				}
				// console.log(tab_params);
				return {
					value:valeur,
					params:tab_params
				};
			}else{
				return null;
			}
		}
	},
	getEvents:function(){
		return this.ical.events;
	}
}

/**
	2009-10-15T14:42:51Z	- 20
	20091015T144251Z		-16
	0   4 6  9 1 3
*/
function dateFromISO8601(dtstr) {
	if (!dtstr)
		return null;
	if (dtstr.length == 16) {
		return new Date(Date.UTC(dtstr.substr(0, 4), dtstr.substr(4, 2), dtstr.substr(6, 2), 
			dtstr.substr(9, 2), dtstr.substr(11, 2), dtstr.substr(13, 2)));
	} else {
		dtstr = dtstr.replace(/\D/g," ");
		var dtcomps = dtstr.split(" ");
		// modify month between 1 based ISO 8601 and zero based Date
		dtcomps[1]--;
		return new Date(Date.UTC(dtcomps[0],dtcomps[1],dtcomps[2],dtcomps[3],dtcomps[4],dtcomps[5]));
	}
}

function formatDate(dt) {
	return dt.getDate() + ' ' + locmonths()[dt.getMonth()] + ' ' + dt.getFullYear();
}

function formatGeo(coord) {
	var d = Math.round((coord * 1000000) / 1000000);
	var p = Math.round(1000000 * (coord - d));
	return d + '.' + padZeros(p, 6);
}

function parseLatitude(geo) {
	if (!geo)
		return 0.0;
	var ll = geo.split(";");
	if (ll.length == 2)
		return parseFloat(ll[0]);
}

function parseLongitude(geo) {
	if (!geo)
		return 0.0;
	var ll = geo.split(";");
	if (ll.length == 2)
		return parseFloat(ll[1]);
}

function padZeros(num, totalLen) {
	var numStr = num.toString() // Initialize return value
	// as string
	var numZeros = totalLen - numStr.length // Calculate no. of zeros
	if (numZeros > 0) {
		for (var i = 1; i <= numZeros; i++) {
			numStr = "0" + numStr
		}
	}
	return numStr
}

function formatTime(dt) {
	return padZeros(dt.getHours(), 2) + ':' + padZeros(dt.getMinutes(), 2);
}

function initDatabase() {  
	curDB = null;
	try {  
		if (!window.openDatabase) {  
			alert(chrome.i18n.getMessage('msg_db_open_err_nodb'));
        	} else {  
			var maxSize = 83886080; 
			curDB = openDatabase('dbtodo', '1.0', 'ToDo database', maxSize, onDBCreate);  
		}  
	} catch (e) {  
		if (e == 2) {  
			// Version number mismatch.  
			console.log(chrome.i18n.getMessage('msg_db_open_err_ver'));  
		} else {  
			console.log(chrome.i18n.getMessage('msg_db_open_err_unk') + ": " + e + ".");  
		}  
	}  
	return curDB;  
}

function onDBCreate(db) {  
	// re-create table todo
	// nullDataHandler
	db.transaction(  
		function (transaction) { 
			transaction.executeSql(chrome.i18n.getMessage('sql_tbl_todo'), [], 
			function (tx, res) {
				alert(chrome.i18n.getMessage('msg_table_create_done'));
			},
			errorHandler);  
		}  
	);  
	// prePopulate(db);  
}

function addNew(db, ev, userid, ev_src) {  
	db.transaction(
		function (transaction) {
			var status = 0;
			var done = 0;
			var created = new Date();
			var rem = '';
			var contact = '';
			
			var g = ev.geo.value;
			var latitude = parseLatitude(g);
			var longitude = parseLongitude(g);
			var orgemail = ev.organizer?ev.organizer.value:"";
			// remove mailto: if exists
			orgemail = orgemail.replace(/^MAILTO\:/,"");
			var data = [
				ev.uid.value, 
				status, 
				done,
				ev.url.value, 
				created,
				dateFromISO8601(ev.dtstart.value).valueOf(),
				dateFromISO8601(ev.dtend.value).valueOf(),
				ev.location.value,
				latitude, 
				longitude, 
				ev.title.value,
				ev.summary.value,
				ev.description.value, 
				userid,
				ev.organizer.cn?ev.organizer.cn:"",
				orgemail,
				ev.tel?ev.tel.value:"",
				rem,
				ev_src
			];
			transaction.executeSql(chrome.i18n.getMessage('sql_ins_todo'), data, addHandler, errorHandler);
		}  
	);
}

function addHandler() {
	refreshList(curDB, curModeDone);
	console.log("added");
}

function delHandler() {
	refreshList(curDB, curModeDone);
	console.log("deleted");
}

function deleteDone(db){  
	db.transaction(  
		function (transaction) {  
			if (!transaction) {
				console.log(chrome.i18n.getMessage('msg_db_open_err_unk') + ": " + e + ".");  
				return;
			}
			transaction.executeSql(chrome.i18n.getMessage('sql_del_done'), [1],
				delHandler, errorHandler);  
		}  
	);  
}  

function refreshList(db, show_done){  
	curModeDone = show_done;
	db.transaction(  
		function (transaction) {  
			if (!transaction) {
				console.log(chrome.i18n.getMessage('msg_db_open_err_unk') + ": " + e + ".");  
				return;
			}
			transaction.executeSql(chrome.i18n.getMessage('sql_sel_todo'), [show_done],  
				dataSelectHandler, errorHandler);  
		}  
	);  
}  

function dataSelectHandler(transaction, ds) {  
	// Handle the result
	$('#header').html(
		"<td id='row1'>" + chrome.i18n.getMessage('col_title_dtstart') + "</td>" +
		"<td id='row2'>" + chrome.i18n.getMessage('col_title_dtstart_time') + "</td>" +
		"<td id='row3'>" + chrome.i18n.getMessage('col_title_location') + "</td>" +
		"<td id='row4'>" + chrome.i18n.getMessage('col_title_title') + "</td>" +
		"<td id='row5'>" + chrome.i18n.getMessage('col_title_summary') + "</td>" +
		"<td id='row6'>" + chrome.i18n.getMessage('col_title_description') + "</td>"
	);
	$('#list').html('');
	for (var i = 0; i < ds.rows.length; i++) {
		var row = ds.rows.item(i);
		var url = row['url'];
		if (url)
			url = '<a href="' + url + '">' + url + '</a>';
		var email = row['orgemail'];
		if (email)
			email = '<a href="mailto:' + email + '">' + email + '</a>';
		var tel = row['orgphone'];
		if (tel)
			tel = '<a href="tel:' + tel + '">' + tel + '</a>';
		var done;
		if (curModeDone == 0)
			done = '<a href="#" class="done" id="done' + row['id'] + '"><img src="i/done.png"></a>';
		else
			done = '';
		var del = ''; // '<a href="#" class="rm" id="rm' + row['id'] + '"><img src="i/rm.png"></a>';
		$('#list').append("<tr id='row1'>" + 
			// "<td class='id'>"+ row['id'] +"</td>" +
			// "<td class='uid'>"+ row['uid'] +"</td>" +
			// "<td class='status'>"+ row['status'] +"</td>" +
			// "<td class='done'>"+ row['done'] +"</td>" +
			// "<td class='created'>"+ row['created'] +"</td>" +
			// "<td class='userid'>"+ row['userid'] +"</td>" +
			"<td class='dtstart'>"+ formatDate(new Date(row['dtstart'])) +"</td>" +
			"<td class='dtstart'>"+ formatTime(new Date(row['dtstart'])) +"</td>" +
			// "<td class='dtend'>"+ row['dtend'] +"</td>" +
			"<td class='location'>"+ row['location'] +"</td>" +
			// "<td class='lat'>"+ row['lat'] +"</td>" +
			// "<td class='lon'>"+ row['lon'] +"</td>" +
			"<td class='title'>"+ row['title'] +"</td>" +
			"<td class='summary'>"+ row['summary'] +"</td>" +
			"<td class='description'>"+ row['description'] +"</td>" +
			//"<td class='orgcn'>"+ row['orgcn'] +"</td>" +
			//"<td class='url'>"+ url +"</td>" +
			//"<td class='orgemail'>"+ email +"</td>" +
			//"<td class='orgphone'>"+ tel +"</td>" +
			"<td class='btn-panel-invisible'>"+ done + del + "</td>" +
			//"<td class='rem'>"+ row['rem'] +"</td>" +
		"</tr>");
	}  
	$('tr').hover(
		function(){
			$(this).find('td').addClass('hover');
			$(this).find('td:nth-child('+(7)+')').addClass('btn-panel-visible');
			$(this).find('td:nth-child('+(7)+')').removeClass('btn-panel-invisible');
			// $('table td:nth-child('+(11)+')').removeClass('btn-panel-invisible');
		},
		function(){
			$(this).find('td').removeClass('hover');
			$(this).find('td:nth-child('+(7)+')').removeClass('btn-panel-visible');
			$(this).find('td:nth-child('+(7)+')').addClass('btn-panel-invisible');
		}
	);

	$("table tr:nth-child(even)").addClass("striped");
	$(".done").bind('click', doDone);
}  

function doDone() {
	var id = $(this)[0].id;
	id = id.replace(/^done/,"");
	curDB.transaction(  
		function (transaction) {  
			if (!transaction) {
				console.log(chrome.i18n.getMessage('msg_db_open_err_unk') + ": " + e + ".");  
				return;
			}
			transaction.executeSql(chrome.i18n.getMessage('sql_upd_done'), [id],  
				function (tx, res) {
					console.log("done: " + id);  
					refreshList(curDB, curModeDone);
				}, 
				errorHandler);
		}
	);  
}


function errorHandler(transaction, e) {
	var s = chrome.i18n.getMessage('msg_db_error') + ' ' + e.code + ': ' + e.message;
	console.log(s);
	alert(s);
}

// get localized month names
function locmonths() {
	return [
		chrome.i18n.getMessage('m1'),
		chrome.i18n.getMessage('m2'),
		chrome.i18n.getMessage('m3'),
		chrome.i18n.getMessage('m4'),
		chrome.i18n.getMessage('m5'),
		chrome.i18n.getMessage('m6'),
		chrome.i18n.getMessage('m7'),
		chrome.i18n.getMessage('m8'),
		chrome.i18n.getMessage('m9'),
		chrome.i18n.getMessage('m10'),
		chrome.i18n.getMessage('m11'),
		chrome.i18n.getMessage('m12')
	];
}