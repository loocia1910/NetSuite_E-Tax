//-----------------------------------------------------------------------------------------------------------
// NetSuite Script Name/ID: E-TAX Tax Invoice Issue create_popbill / customscript_e_tax_ll_create
// NetSuite DeploymentName/ID : E-TAX Tax Invoice Issue create_popbill / customdeploy_e_tax_ll_create
//-----------------------------------------------------------------------------------------------------------


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


    async function post(requestBody) {
        try {
            let response = {
                submitID: '',
                rowRecordId: null
            }
            
            const parsedBody = JSON.parse(requestBody);
            const invoiceInfoList = parsedBody.invoiceInfoList;
            const submitID = parsedBody.submitID;
            const writeDate = parsedBody.writeDate;
            log.debug('post 요청__ll_create  invoiceInfoList ==== ', invoiceInfoList);
            
            // 1. record에서 개별 invoice 정보들 찾기
            // 2. 찾은 정보로 taxInvoice 리스트 생성 (submitId 생성 규칙 : 고객번 + invoice_number 사용)
            // 3. popbill TOKEN 생성 
            // 4. popbill bulkSubmit 요청
            const invoiceList = searchInvoiceList(invoiceInfoList);
            const BulkRequestBody = setBulkReqBody(writeDate, invoiceList);
            const res = await createBulkSubmit(submitID, BulkRequestBody);

            // 5. RECODRD : CUSTOMER_LEDGER bulksubmit flag 
            // 6. RECODRD : TAX_INVOICE_SUBMIT_LOG 상태 저장
            if(res.code === 1) {
                setCLBulkSubmitFlag(submitID, invoiceList);  // invoiceList에서 search 되 record International ID를 가지고, submitID와 flag - '1' 일괄 저장
                const res = setBulkSubmitLog(submitID);
                response = res;
            }

            return JSON.stringify(response);

        } catch(err) {
            throw error.create({
                name: 'rl_e_tax_ll_create.js post Fail',
                message: err
            });
        }
    };


    function setCLBulkSubmitFlag(submitID, invoiceList) {
        try {
            const prefix = "custrecord_ko_cl_"

            invoiceList.forEach(rowData => {
                let etaxRecord = record.load({
                    type: 'customrecord_ko_customer_ledger',
                    id: rowData.id,
                    isDynamic: true
                });

                etaxRecord.setValue(prefix + 'flag', '1'); // '1' : bulkSbumit API 호출 - yes
                etaxRecord.setValue(prefix + 'submit_id', submitID);
                etaxRecord.save();
            });


        } catch(err) {
            throw error.create({
                name: 'setBulkSubmitFlag Fail',
                message: err
            });
        }
    } 


    function setBulkSubmitLog(submitID) {
        try {
            const prefix = "custrecord_ko_ti_log_"
            const currentUser = runtime.getCurrentUser();

            let submitLogRecord = record.create({
                type: 'customrecord_ko_ti_sumbit_log',
                isDynamic: true
            
            });

            submitLogRecord.setValue(prefix + 'subsidiary_id', currentUser.subsidiary);
            submitLogRecord.setValue(prefix + 'creator_id', currentUser.id);
            submitLogRecord.setValue(prefix + 'creator', currentUser.name);
            submitLogRecord.setValue(prefix + 'submit_id', submitID);
            submitLogRecord.setValue(prefix + 'request_date', new Date());
            submitLogRecord.save();

            return { submitID, rowRecordId : submitLogRecord.id }
        } catch(err) {
            throw error.create({
                name: 'setBulkSubmitFlag Fail',
                message: err
            });
        }
    } 

    const searchInvoiceList = (paramArray) => {
            const prefix = 'custrecord_ko_cl_'; 
            let transactionFilters = [];
            /* transaction_id 필터 생성 */
            if (paramArray) {
                for (let obj of paramArray) {
                    transactionFilters.push([prefix + 'transaction_id', search.Operator.IS, obj.transaction_id]);
                    // transactionFilters.push('and')
                    // transactionFilters.push([[prefix + 'flag', search.Operator.ISNOT, '1'], 'and', [prefix + 'flag', search.Operator.ISNOT, '2']]) // flag 값이 '1'이나 '2'가 아닌 것 (bulkSbumit 또는 getBulkSumbitResult 호출하지 않은 것)
                    transactionFilters.push('or')
                    //transactionFilters.push([ [prefix + 'flag', search.Operator.ISNOT, '1'], 'and', [prefix + 'flag', search.Operator.ISNOT, '2'] ]) // flag 값이 '1'이나 '2'가 아닌 것 (bulkSbumit 또는 getBulkSumbitResult 호출하지 않은 것)
                }

                transactionFilters.pop(); // 마지막 'or' 제거
            }

            log.debug('transactionFilters ', transactionFilters);
            
            /* transaction_id 를 DESC 하기 위한 컬럼변수 */
            const tranIdCol = search.createColumn({
                name: prefix + 'transaction_id',
                sort: search.Sort.DESC
            });
            const clSearch = search.create({
                type: search.Type.CUSTOM_RECORD + '_ko_customer_ledger',
                columns: [
                    prefix + 'customer_number',
                    prefix + 'customer_name',
                    prefix + 'net_amount',
                    prefix + 'amount',
                    prefix + 'not_tax_amount',
                    prefix + 'tax_amount',
                    prefix + 'tax_code',
                    prefix + 'service_tax_date',
                    prefix + 'subsidiary_id',
                    prefix + 'document_number',
                    tranIdCol,  // transaction_id 를 DESC 하기 위한 컬럼변수
                    // prefix + 'tax_rate',
                    // prefix + 'invoice_number',
                    // prefix + 'department_id',
                    // prefix + 'class',
                    // prefix + 'location',
                    // prefix + 'transaction_type',
                    // prefix + 'date_tax_point',
                ],
                filters: transactionFilters
            });


            let results = [];
            clSearch.run().each(function(result) {
                const prefix = "custrecord_ko_cl_";

                // log.debug("if 안 result ---", result)
                // if (result.getValue(prefix + 'invoice_number') === '') {
                    // res.index = index + 1;
                let res = {};
                res.id = result.id;
                res.subsidiary_id = result.getValue(prefix + 'subsidiary_id');
                res.document_number = result.getValue(prefix + 'document_number');
                res.transaction_id = result.getValue(prefix + 'transaction_id');
                res.customer_name = result.getValue(prefix + 'customer_name');
                res.net_amount = result.getValue(prefix + 'net_amount');
                if (result.getValue(prefix + 'amount') !== '' || parseInt(result.getValue(prefix + 'amount')) === 0)
                    res.custlist_amount = result.getValue(prefix + 'amount');
                else
                    res.custlist_amount = result.getValue(prefix + 'not_tax_amount');
                res.tax_amount = result.getValue(prefix + 'tax_amount');
                res.tax_code = result.getValue(prefix + 'tax_code');
                res.tax_date = result.getValue(prefix+'service_tax_date');
                // res.status = '대기중';
                results.push(res);
                // }
                return true;
            });

            log.debug("Search 로 찾은 results ---", results)
            log.debug("Search 로 찾은 results.length ---", results.length)

            return results;

    }

    

    const setBulkReqBody = (writeDate, reqList) => {
        log.debug('setBulkReqBody/reqList', reqList);
        log.debug('setBulkReqBody/reqList.length', reqList.length);

        let BulkRequestBody = {  forceIssue : false, invoices: [] };
        let TaxinvoiceList = [];

        for(let el of reqList) {
            let taxinvoice = {
                writeDate: writeDate,          // 작성일자,
                chargeDirection: "정과금" ,       //  "정과금" / "역과금" ,   --> !!!변경필요
                issueType: "정발행",           //  "정발행" / "역발행" / "위수탁"   --> !!!변경필요
                taxType: "과세",   //  "과세" / "영세" / "면세"
                purposeType: "영수" ,                 // "영수" / "청구" / "없음" ,  --> !!!확인필요
                supplyCostTotal: el.custlist_amount,        // 공급가액 합계,
                taxTotal: el.tax_amount,                    // 세액 합계,
                totalAmount: el.net_amount,                 // 합계금액,
                invoicerMgtKey: el.id + "_" + el.subsidiary_id + "_" + el.document_number ,              // 공급자 문서번호, (5687_1_INV-KOR-59)
                invoicerCorpNum: "1234567890",             // 공급자 사업자번호,
                invoicerCorpName: "윌러스테스트",            // 공급자 상호,
                invoicerCEOName: "윌러스CEO",              // 공급자 대표자 성명,
                invoiceeType:  "사업자" ,                   // 거래처 구분 : "사업자" / "개인" / "외국인" , --> !!!확인필요
                invoiceeCorpNum: "1234567890",               // 거래처 사업자번호,   --> !!!변경필요
                invoiceeCorpName: el.customer_name,              // 거래처 상호,
                invoiceeCEOName: "김개발",               // 거래처 대표자 성명,   --> !!!변경필요 __ 현재 레코드에는 관련필드가 없음
            };

            TaxinvoiceList.push(taxinvoice);
        };   

        BulkRequestBody.invoices = TaxinvoiceList;
        log.debug('setBulkReqBody/BulkRequestBody', BulkRequestBody);
        return BulkRequestBody;

    }

    async function createBulkSubmit( submitID, BulkRequestBody ) {
        try {
            log.debug("[createBulkSubmit] BulkRequestBody ", BulkRequestBody)

            const prefix ='custscript_';
            const script = runtime.getCurrentScript();

            const ENV = script.getParameter({ name : prefix + 'e_tax_env'});
            const POPBILL_USER_ID = script.getParameter({ name : prefix + 'popbill_user_id'});
            const POPBILL_API_HOST = ENV === 'TEST' ? 'https://popbill-test.linkhub.co.kr' : 'https://popbill.linkhub.co.kr';

            const API_Session_Token = await getToken();
            const MessageDigest = getSHA1Base64(stringify(BulkRequestBody));
            
            var headerObj = new Array();
            headerObj['Authorization'] = API_Session_Token;
            headerObj['x-pb-userid'] = POPBILL_USER_ID;
            headerObj['X-HTTP-Method-Override'] = 'BULKISSUE';
            headerObj['x-pb-submit-id'] = submitID;
            headerObj['x-pb-message-digest'] = MessageDigest;
            headerObj['Content-Type'] = 'application/json';
            headerObj['Accept'] = '*/*';


            const res = await https.post({
            url:  `${POPBILL_API_HOST}/Taxinvoice`,
            headers: headerObj,
            body: stringify(BulkRequestBody)
            }); 
            
            return JSON.parse(res.body);

        } catch(err) {

            throw error.create({
                name: 'CreateBulkSubmit Fail',
                message: err
            });
        }

    };


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