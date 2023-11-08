
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
], function(CryptoJS, record, https, runtime, search) {

    async function post(requestBody) {
        // 날짜와 검색유형이 와야함
        const parsedBody = JSON.parse(requestBody);
        const invoiceInfoList = JSON.parse(parsedBody.invoiceInfoList);
        // 1. record에서 개별 invoice 정보들 찾기
        // 2. 찾은 정보로 taxInvoice 리스트 생성 (submitId 생성 규칙 : 고객번 + invoice_number 사용)
        // 3. TOKEN 생성 
        // 4. popbill 요청
        // 5. Customer_Leadger 결과요청 flag 
        // 6. submitLog bulkSubmit 저장
        const invoiceList = searchInvoiceList(invoiceInfoList);
        const BulkRequestBody = setBulkReqBody(invoiceList);
        const res = createBulkSubmit(BulkRequestBody);

        let response = {};
        return JSON.stringify(response);
    };

    const searchInvoiceList = (paramArray) => {
        // subsidiary_id, transaction_id
            const prefix = 'custrecord_ko_cl_';
            let filters = [];
            /* transaction_id 필터 생성 */
            if (paramArray) {
                for (let obj of paramArray) {
                    filters.push([prefix + 'transaction_id', search.Operator.IS, obj.transaction_id]);
                    filters.push('or')
                }
                filters.pop();
            }
            
            /* transaction_id 를 DESC 하기 위한 컬럼변수 */
            const tranIdCol = search.createColumn({
                name: prefix + 'transaction_id',
                sort: search.Sort.DESC
            });
            const clSearch = search.create({
                type: search.Type.CUSTOM_RECORD + '_ko_customer_ledger',
                columns: [
                    // prefix + 'tax_rate',
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
                    // prefix + 'invoice_number',
                    // prefix + 'department_id',
                    // prefix + 'class',
                    // prefix + 'location',
                    // prefix + 'transaction_type',
                    // prefix + 'date_tax_point',
                ],
                filters: filters
            });


            let results = [];
            clSearch.run().each(function(result) {
                const prefix = "custrecord_ko_cl_";
                let res = {};
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

            return results;

    }

    
    const setBulkReqBody = (reqList) => {

        let BulkRequestBody = {  forceIssue : false, invoices: [] };
        let TaxinvoiceList = [];

        for(let el of reqList) {
            let taxinvoice = {
                writeDate: el.tax_date,          // 작성일자,
                chargeDirection: "정과금" ,       //  "정과금" / "역과금" ,   --> !!!변경필요
                issueType: "정발행",           //  "정발행" / "역발행" / "위수탁"   --> !!!변경필요
                taxType: "과세",   //  "과세" / "영세" / "면세"
                purposeType: "영수" ,                 // "영수" / "청구" / "없음" ,  --> !!!확인필요
                supplyCostTotal: el.custlist_amount,        // 공급가액 합계,
                taxTotal: el.tax_amount,                    // 세액 합계,
                totalAmount: el.net_amount,                 // 합계금액,
                invoicerMgtKey: el.subsidiary_id + "_" + el.document_number ,              // 공급자 문서번호,
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
        return BulkRequestBody;

    }

    async function createBulkSubmit( BulkRequestBody ) {
        let SubmitID = runtime.getCurrentUser().id + getCurrentJulianDate();
        const POPBILL_API_HOST = 'https://popbill-test.linkhub.co.kr' ;
        const API_Session_Token = await getToken();
        const MessageDigest = getSHA1Base64(stringify(BulkRequestBody));
        function stringify(obj) {
            return JSON.stringify(obj,function(key,value){return !value ? undefined : value;});
        }
        
        function getSHA1Base64(input){
            return CryptoJS.SHA1(input).toString(CryptoJS.enc.Base64);
        };
        log.debug("createBulkSubmit/MessageDigest :" + MessageDigest)
        
        var headerObj = new Array();
        headerObj['Authorization'] = API_Session_Token;
        headerObj['x-pb-userid'] = 'testkorea';
        headerObj['X-HTTP-Method-Override'] = 'BULKISSUE';
        headerObj['x-pb-submit-id'] = SubmitID;
        headerObj['x-pb-message-digest'] = MessageDigest;
        headerObj['Content-Type'] = 'application/json';
        headerObj['Accept'] = '*/*';


        const res = await https.post({
          url:  `${POPBILL_API_HOST}/Taxinvoice`,
          headers: headerObj,
          body: stringify(BulkRequestBody)
        }); 
        

        return JSON.parse(res.body);

    };




    async function getToken() {

        var Scopes = ['member', '110'];
        var TokenRequest = stringify({access_id : '1234567890', scope : Scopes});
        var Body = CryptoJS.SHA256(TokenRequest).toString(CryptoJS.enc.Base64);
        var RequestDT = new Date().toISOString();

        let reqUrl ='/POPBILL_TEST/Token';

        var digestTarget =
              'POST\n' +
              Body + '\n' +
              RequestDT +'\n' +
              '*\n' +
              '2.0\n' +
              reqUrl
        ;
        
        var HMACDigest = generateSignature(digestTarget, '');
        var Authorization = 'LINKHUB '+'' + ' '+HMACDigest;
        
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
            url: 'https://auth.linkhub.co.kr' + reqUrl,
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


    function getCurrentJulianDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1; // 월은 0부터 시작하므로 +1 해줍니다.
        const day = now.getDate();
        const hour = now.getHours();
        const minute = now.getMinutes();
        const second = now.getSeconds();
      
        // 율리우스 (Julian) 날짜 계산식 사용
        const a = Math.floor((14 - month) / 12);
        const y = year + 4800 - a;
        const m = month + 12 * a - 3;
      
        const julianDay =
          day +
          Math.floor((153 * m + 2) / 5) +
          365 * y +
          Math.floor(y / 4) -
          Math.floor(y / 100) +
          Math.floor(y / 400) -
          32045;
      
        // 시, 분, 초를 시간으로 변환하여 더합니다.
        const julianTime = hour / 24 + minute / 1440 + second / 86400;
      
        return String(julianDay + julianTime).replace('.', '-');
    }
      

    return {
        post
    }
});