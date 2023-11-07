/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @NModuleScope Public
*/

//-----------------------------------------------------------------------------------------------------------
// NetSuite ScripName/ScriptId E-TAX Tax Invoice schedule_popbill / customscript_e_tax_issue_schedule
// NetSuite DeploymentID : 	customdeploy_e_tax_issue_popbill
//-----------------------------------------------------------------------------------------------------------



define([
    './lib/crypto-js.js', 
    'N/https',
    'N/record',
    'N/runtime',
    'N/search',
    'N/error'
], function(CryptoJS, https, record, runtime, search, error) {

    let TOKEN_API_HOST = 'https://auth.linkhub.co.kr';
    let POPBILL_API_HOST = 'https://popbill.linkhub.co.kr';

    let LINK_ID;
    let SECRET_KEY;
    let ACCESS_ID; // 사업자번호.
    let POPBILL_USERID;

    let dateType;
    let dateFrom;
    let dateTo;
    let searchType;

    function initScriptParameter() {
        const script = runtime.getCurrentScript();

        dateType = script.getParameter({ name: 'custscript_date_type' });
        dateFrom = script.getParameter({ name: 'custscript_date_from' });
        dateTo = script.getParameter({ name: 'custscript_date_to' });
        searchType = script.getParameter({ name: 'custscript_search_type' });

        LINK_ID = script.getParameter({ name: 'custscript_link_id' });
        SECRET_KEY = script.getParameter({ name: 'custscript_secret_key' });
        ACCESS_ID = script.getParameter({ name: 'custscript_access_id' });
        POPBILL_USERID = script.getParameter({ name: 'custscript_popbill_id' });


        // 기본값 - 일자구분: 전송일자, 일자From: 전전월 1일, 일자To: 당월 말일
        if (!dateType) dateType = 'I';
        if (!dateFrom || !dateTo) {
            const today = new Date();
            dateFrom = new Date(today.getFullYear(), today.getMonth() - 2, 1);
            dateTo = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        }
        if (!searchType) searchType = 'BUY';
        if (!LINK_ID) {
            throw error.create({
                name: 'Script Parameter Error',
                message: 'Link Id is Blank'
            });
        }
        if (!SECRET_KEY) {
            throw error.create({
                name: 'Script Parameter Error',
                message: 'Secret Key is Blank'
            });
        }
        if (!ACCESS_ID) {
            throw error.create({
                name: 'Script Parameter Error',
                message: 'Access Id is Blank'
            });
        }
        if (!POPBILL_USERID) {
            throw error.create({
                name: 'Script Parameter Error',
                message: 'Popbill Id is Blank'
            });
        }


        dateFrom = dateToString(dateFrom);
        dateTo = dateToString(dateTo);

        // log.debug('requsetJob parameters', 'dateType = ' + dateType + ', dateFrom = ' + dateFrom + 
        //             ', dateTo = ' + dateTo + ', popbill id = ' + POPBILL_USERID);

    }

    
    function execute(context) {

        let receivedCnt = 0;
        let savedCnt = 0;

        try {
            initScriptParameter();

            log.audit('execute: info', 'searchType = ' + searchType + ', dateType = ' + dateType + 
                    ', dateFrom = ' + dateFrom + ', dateTo = ' + dateTo);

            getToken(LINK_ID, SECRET_KEY, ACCESS_ID);
          
        } catch (e) {
            log.error(e.name, e);
        }
        

        log.audit('execute: result', 'received = ' + receivedCnt + ', saved = ' + savedCnt);

    }




    function dateToString(dateObj) {
        // return YYYYMMDD
        return dateObj.toISOString().split('T')[0].replace(/-/gi, '');
    }


    function getToken(LinkID, SecretKey, AccessId) {

        var Scopes = ['member', '111'];
        var TokenRequest = stringify({access_id : AccessId, scope : Scopes});
        var Body = CryptoJS.SHA256(TokenRequest).toString(CryptoJS.enc.Base64);

        var RequestDT = new Date().toISOString();

        var digestTarget =
              'POST\n' +
              Body + '\n' +
              RequestDT +'\n' +
              '*\n' +
              '2.0\n' +
              '/POPBILL/Token';
        
        var HMACDigest = generateSignature(digestTarget, SecretKey);
        var Authorization = 'LINKHUB '+LinkID + ' '+HMACDigest;
        
        
        function stringify(obj) {
          return JSON.stringify(obj,function(key,value){return !value ? undefined : value;});
        }
        
        function generateSignature(message, key) {
            var keyDec = CryptoJS.enc.Base64.parse(key)
            var enc = CryptoJS.HmacSHA256(message, keyDec).toString(CryptoJS.enc.Base64);
            return enc;
        }


        var headerObj = new Array();
        headerObj['Content-Type'] = 'application/json';
        headerObj['Accept'] = '*/*';
        headerObj['x-lh-date'] = RequestDT;
        headerObj['x-lh-version'] = '2.0';
        headerObj['x-lh-forwarded'] = '*';
        headerObj['Authorization'] = Authorization;
        

        const response = https.post({
            url: TOKEN_API_HOST + '/POPBILL/Token',
            body: TokenRequest,
            headers: headerObj
        });

        if (response.code == 200) {
            API_Session_Token = 'Bearer ' +  JSON.parse(response.body).session_token;
        }

    }


   


    return {
        execute
    }
    
});