# Copyright (c) 2017 CICESE

# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at

# http://www.apache.org/licenses/LICENSE-2.0

# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


# System and format dependencies
import os
import json

# Flask dependencies to handle Response's header
from flask import request, Response

# Constant declaration. Answer the question: What module is the data coming from?
PATIENTS_MODULE 	= "refUser";
TEST_MODULE 		= "refEvent";
VARIALES_MODULE 	= "";

""" NGSIData
This class enable a simple mechanism to retrieve HDFS files by CURL calls. Directories are gathered and opened in order to 
build a NGSI v1 structure.
"""
class NGSIData:
	def __init__(self):
		print("NGSIData object created");

	def post(self, _username, _service, _servicePath, _q, _t, _args, _token):
		_data = Retrieve();
		return _data.fromHDSFtoJson(_username, _service, _servicePath, _q, _t, _args, _token);
	
class Retrieve:
	def __init__(self):
		print("Retrieve object created");

	def fromHDSFtoJson(self, _username, _service, _servicePath, _q, _t, _args, _token):
		# Query data to filter outcome
		q = json.loads(_q)["q"];
		
		# Auxiliar variable
		extension = "";

		# To retrieve: PhysicalTest data
		if (q[0] == PATIENTS_MODULE):
			extension = "http://207.249.127.162:1234/users";
		
		if (q[0] == TEST_MODULE):
			extension = "./physicalTest";

		if (q[0] == VARIALES_MODULE):
			extension = "";
		
		# Parameter extraction
		limit 	= request.args["limit"];
		details = request.args["details"];
		offset 	= request.args["offset"];

		print("Retrieving directory list");
		resultList = os.popen('curl -X GET "http://storage.cosmos.lab.fiware.org:14000/webhdfs/v1/user/'+_username+'/'+_service+_servicePath+'?op=liststatus&user.name='+_username+'" -H "X-Auth-Token: '+_token+'"').read();
		resultList = json.loads(resultList);

		# Number of elements retrieved.
		elementList = [];
		elementList = resultList["FileStatuses"]["FileStatus"];
		count 		= len(elementList);

		if int(offset) > 0:
			# Removing elements due offset
			i = 0;
			while i < int(offset):
				if elementList[0]:
					del elementList[0];
					i += 1;

		if len(elementList) > int(limit):
			# Temporal count to keep track of the updated number of elements to print.
			_count = len(elementList);
			# Removing elements due limit
			i = 0;
			while i < abs(_count-int(limit)):
				if elementList[-1]:
					del elementList[-1];
					i += 1;

		# Root structure.
		contextResponses = [];
		flag = False;

		for key in resultList["FileStatuses"]["FileStatus"]:
			# CURL call to Cosmos.
			print("Reading specific directory");
			result = os.popen('curl -X GET "http://storage.cosmos.lab.fiware.org:14000/webhdfs/v1/user/'+_username+'/'+_service+_servicePath+'/'+key["pathSuffix"]+'/'+key["pathSuffix"]+'.txt?op=OPEN&user.name='+_username+'" -H "X-Auth-Token: '+_token+'"').read();
			result = result.split('\n');

			# We need to remove the last element since it will always be a break-line character.
			del result[-1];

			# Root atribute's element struture.
			attributesWrap 	= [];

			# Dynamic building process, starts here.
			# ===========================================
			for element in result:
				# Get each single line to handle them as json objects.
				jsonResult 	= json.loads(element);
			
				if ( jsonResult["attrValue"] == ("%s/%s" % (extension, q[1])) ) and ( jsonResult["entityType"] == _t ):
					flag = True;
				else:
					flag = False;

				# Collection of basic/general data to fill entities.
				entityId 	= jsonResult["entityId"];
				entityType 	= jsonResult["entityType"];

				# Atributes data gathering.
				attributes = {};
				attributes["name"] 	= jsonResult["attrName"];
				attributes["type"] 	= jsonResult["attrType"];
				attributes["value"] = jsonResult["attrValue"];

				# Getting together attributes
				attributesWrap.append(attributes);

				contextElement = {};
				contextElement["type"] 		= entityType;
				contextElement["isPattern"] = "false";
				contextElement["id"] 		= entityId;
				contextElement["attributes"]= attributesWrap;
			# Dynamic building process, ends here.
			# ===========================================

				if flag:
					# Status response from contextElement.
					statusCode = {};
					statusCode["code"] 			= "200";
					statusCode["reasonPhrase"] 	= "OK";

					# Context Elements.
					contextElementWrap = {};
					contextElementWrap["contextElement"]= contextElement;
					contextElementWrap["statusCode"] 	= statusCode;
					
					# Getting togheter context elements
					contextResponses.append(contextElementWrap);

		# Status response from all call.
		errorCode = {};
		errorCode["code"] 			= "200";
		errorCode["reasonPhrase"] 	= "OK";
		errorCode["details"] 		= "Count: "+str(count);

		# Putting json pieces together.
		mainObject = {};
		mainObject['contextResponses'] 	= contextResponses;
		mainObject['errorCode'] 		= errorCode;

		return json.dumps(mainObject);
