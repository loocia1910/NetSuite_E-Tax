

/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope Public
*/
define([
    '../../lib/crypto-js.js', 
    'N/record',
    'N/https',
    'N/runtime',
    'N/search', 
    'N/error',
    'N/format',
], function(CryptoJS, record, https, runtime, search, error, format) {

    const bulkSubmitFlags = {
        '0': '', 
        '1': 'bulkSubmit', 
        '2': 'getBulkSubmitResult', 
    }

    async function post(requestBody) {
        try {
            // 날짜와 검색유형이 와야함
            const response  = {
                txState : 0,
            }
            const parsedBody = JSON.parse(requestBody);
            const SubmitID = JSON.parse(parsedBody.SubmitID);
            log.debug('getBulkSubmitResult SubmitID ==== ', SubmitID);
            
            // 1. popbill TOKEN 생성 
            // 2. popbill getBulkSubmitRes 요청
            // 3. RECODRD : TAX_INVOICE_SUBMIT_LOG 상태 저장
            // 4. RECODRD : CUSTOMER_LEDGER에서 SubmitID로 Invoice 찾기
            // 5. RECODRD : E_TAX_ESERO 결과 저장
            const res = await getBulkSubmitResult(SubmitID);
            log.debug('post 요청 getBulkSubmitResult res ==== ', res);
            log.debug("res.txState  === 2 ---- ", res.txState === 2)

            /**
             * res 개별 건 for 문
             *  1. submitLog에 저장
             *  2. 개별 전자세금계산서 상태 저장
             *      실패 시
             *          - CUSTOMER_LEDGER 에 팝빌에러 코드 저장
             *      성공 시 
             *          - CUSTOMER_LEDGER에서
             *             - SubmitID로 Invoice 찾기
             *             - flag '2'로 변경
             *          - E_TAX_ESERO 결과 저장
            */
            if(res.txState === 2) {
                response.txState = 2;
                setTIBulkSubmitLog(SubmitID);
            } 
            


            return JSON.stringify(response);

        } catch(err) {
            throw error.create({
                name: 'rl_e_tax_ll_create.js post Fail',
                message: err
            });
        }
    };


    async function getBulkSubmitResult( SubmitID ) {
        try {
            const prefix ='custscript_';
            const script = runtime.getCurrentScript();

            const ENV = script.getParameter({ name : prefix + 'e_tax_env'});
            const POPBILL_USER_ID = script.getParameter({ name : prefix + 'popbill_user_id'});
            const POPBILL_API_HOST = ENV === 'TEST' ? 'https://popbill-test.linkhub.co.kr' : 'https://popbill.linkhub.co.kr';

            const API_Session_Token = await getToken();
            var headerObj = new Array();
            headerObj['Authorization'] = API_Session_Token;
            headerObj['x-pb-userid'] = POPBILL_USER_ID;
            headerObj['Content-Type'] = 'application/json';
            headerObj['Accept'] = '*/*';


            const res = await https.get({
            url:  `${POPBILL_API_HOST}/Taxinvoice/BULK/${SubmitID}`,
            headers: headerObj
            }); 
            

            log.debug('post 요청 getBulkSubmitResult 함수  res.body ==== ', res.body);
            return JSON.parse(res.body);

        } catch(err) {

            throw error.create({
                name: 'getBulkSubmitResult Fail',
                message: err
            });
        }

    };



    function setCLBulkSubmitFlag(SubmitID, invoiceList) {
        try {
            const prefix = "custrecord_ko_cl_"

            // 처리상태 P로 업데이트
            invoiceList.forEach(rowData => {
                let etaxRecord = record.load({
                    type: 'customrecord_ko_customer_ledger',
                    id: rowData.id,
                    isDynamic: true
                });

                etaxRecord.setValue(prefix + 'flag', bulkSubmitFlags['1']);
                etaxRecord.setValue(prefix + 'submit_id', SubmitID);
                etaxRecord.save();
            });


        } catch(err) {
            throw error.create({
                name: 'setBulkSubmitFlag Fail',
                message: err
            });
        }
    } 


    function setTIBulkSubmitLog(SubmitID) {
        try {
            const prefix = "custrecord_ko_ti_log_"
            const currentUser = runtime.getCurrentUser();
            let submitLogRecord = record.load({
                type: 'customrecord_ko_ti_sumbit_log',
                id: 1512
            });

            // submitLogRecord.setValue(prefix + 'submit_id', SubmitID);
            submitLogRecord.setValue(prefix + 'result_date', new Date());
            submitLogRecord.save();

        } catch(err) {
            throw error.create({
                name: 'setBulkSubmitFlag Fail',
                message: err
            });
        }
    } 



    async function getToken() {
        const prefix ='custscript_';
        const script = runtime.getCurrentScript();

        const ENV = script.getParameter({ name: prefix + 'e_tax_env' });
        const ACCESS_ID = script.getParameter({ name: prefix + 'e_tax_access_id' }); // 사업자 번호
        const LINK_ID = script.getParameter({ name: prefix + 'popbill_link_id' });
        const SECRET_KEY = script.getParameter({ name: prefix + 'popbill_secret_key' });


        const Scopes = ['member', '110'];
        const TokenRequest = stringify({access_id : ACCESS_ID, scope : Scopes});
        const Body = CryptoJS.SHA256(TokenRequest).toString(CryptoJS.enc.Base64);
        const RequestDT = new Date().toISOString();

        const reqUrl = ENV === "TEST" ? '/POPBILL_TEST/Token' : '/POPBILL/Token';
        log.debug('reqUrl', reqUrl);
        const digestTarget =
              'POST\n' +
              Body + '\n' +
              RequestDT +'\n' +
              '*\n' +
              '2.0\n' +
              reqUrl
        ;
        
        const HMACDigest = generateSignature(digestTarget, SECRET_KEY);
        const Authorization = 'LINKHUB '+LINK_ID + ' '+HMACDigest;

        let headerObj = new Array();
        headerObj['x-lh-date'] = RequestDT;
        headerObj['x-lh-version'] = '2.0';
        headerObj['Connection'] = 'close';
        headerObj['Authorization'] = Authorization;
        headerObj['x-lh-forwarded'] = '*';
        headerObj['Content-Type'] = 'application/json';
        headerObj['Accept'] = '*/*';


        const response = https.post({
            url: 'https://auth.linkhub.co.kr'+ reqUrl,
            body: TokenRequest,
            headers: headerObj
        });

        if (response.code == 200) {
            return 'Bearer ' + JSON.parse(response.body).session_token;
        } else {
            log.error("requsetJob: url", url);
            log.error("requsetJob: response-code", response.code);
            log.error("requsetJob: response-body", response.body);

            throw error.create({
                name: 'Linkhub Authorization Fail',
                message: response.code + ' / ' + response.body
            });
        }
    }


    function getTaxType(tax_code) {  // "9" -> 숫자형식으로 나옴
        if (tax_code == 'S-KR' || tax_code == 'SO-KR' || tax_code == 'SP-KR' ) { // '01'-일반
              return '일반';
        }
        else if (tax_code == 'Z-KR' ) { // '02'-영세
              return '영세율';
        }
        else if (tax_code == 'EX-KR' ) { // 05'-면세
              return '계산';
        }
    }

    
    function stringify(obj) {
        return JSON.stringify(obj,function(key,value){return !value ? undefined : value;});
    }
    
    function getSHA1Base64(input){
        return CryptoJS.SHA1(input).toString(CryptoJS.enc.Base64);
    };


    function generateSignature(message, key) {
        var keyDec = CryptoJS.enc.Base64.parse(key)
        var enc = CryptoJS.HmacSHA256(message, keyDec).toString(CryptoJS.enc.Base64);
        return enc;
    }


    return {
        post
    }
});