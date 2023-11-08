
//-----------------------------------------------------------------------------------------------------------
// NetSuite Script Name/ID: E-TAX Tax Invoice Issue post_result / customscript_e_tax_ll_post_result
// NetSuite DeploymentName/ID : E-TAX Tax Invoice Issue post_result / customdeploy_e_tax_ll_post_result
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

    const bulkSubmitFlags = {
        '0': '', 
        '1': 'bulkSubmit', 
        '2': 'getBulkSubmitResult', 
    }

    async function post(requestBody) {
        try {
            // 날짜와 검색유형이 와야함
            let response  = {
                txState : 0,
            };
            
            const parsedBody = JSON.parse(requestBody);
            const { submitID, rowRecordId } = parsedBody;
            log.debug('post 요청__ll_post_result submitID ==== ', submitID);
            log.debug('post 요청__ll_post_result rowRecordId ==== ', rowRecordId);

            
            // 1. popbill TOKEN 생성 
            // 2. popbill getBulkSubmitRes 요청
            // 3. RECODRD : TAX_INVOICE_SUBMIT_LOG 상태 저장
            // 4. RECODRD : CUSTOMER_LEDGER에서 SubmitID로 Invoice 찾기
            // 5. RECODRD : E_TAX_ESERO 결과 저장
            const res = await getBulkSubmitResult(submitID);
            const parsedRes = JSON.parse(res);
            log.debug('post 요청__ll_post_result getBulkSubmitResult res ==== ', res);
            log.debug('post 요청__ll_post_result getBulkSubmitResult res.failCount ==== ', res.failCount);
            log.debug('post 요청__ll_post_result getBulkSubmitResult res.failCount ==== ', res.successCount);
            log.debug("res.txState  === 2 ---- ", res.txState === 2)

            /**
             * res 개별 건 for 문
             *  1. submitLog 저장
             *  2. 개별 전자세금계산서 대량발행 결과 저장
             *      실패 시
             *          - CUSTOMER_LEDGER 에 팝빌에러 코드 저장
             *      성공 시 
             *          - CUSTOMER_LEDGER에서
             *             - SubmitID로 Invoice 찾기
             *             - flag '2'로 변경
             *          - E_TAX_ESERO 결과 저장
            */
           if(res.txState === 2 ) { // 처리상태가 완료인 경우만 개별 전자세금영수증 결과 확인 가능
                setTIBulkSubmitLog(submitLogRecordInfo.rowRecordId, parsedRes);
                setTIResultState(parsedRes.issueResult);
                response.txState = 2;
            } 
            

            return JSON.stringify(response);
        } catch(err) {
            throw error.create({
                name: 'rl_e_tax_ll_post_result.js post Fail',
                message: err
            });
        }
    };

    function setTIResultState (issueResult) {
         /**
        * 개별 전자세금계산서 대량발행 결과 저장
        * 실패 시
        *     - CUSTOMER_LEDGER 에 팝빌에러 코드 저장, popbill code, popbill message 변경 (R,U)
        * 성공 시 
        *     - CUSTOMER_LEDGER에서 (R,U)
        *        - SubmitID로 Invoice 찾기
        *        - flag '2'로 변경,
        *     - E_TAX_ESERO  결과 저장 (C)
        *   */

        // [Record 조회] 현재 submitID 가 있는 모든 CUSTOMER_LEDGER 조회
        const record_type = 'customrecord_ko_customer_ledger';
        const row_record_prefix = 'custrecord_ko_cl_';
        const CUSTOMER_LEDGER_SEARCH = setSearchResult(record_type, row_record_prefix);
        console.log("필터한 CUSTOMER_LEDGER_SEARCH ---" , CUSTOMER_LEDGER_SEARCH);

        // 발행 성공/실패 여부에 따른 핸들링
        issueResult.forEach((taxInvoice) => {
            const popbill_code = taxInvoice.code;
            const TI_document_number = taxInvoice.invoicerMgtKey.split('_')[2]; // "5487_1_INV-KOR-52" (el.id + "_" + el.subsidiary_id + "_" + el.document_number)
            // const CL_rowData = CUSTOMER_LEDGER_SEARCH.filter((el) => el.document_number === TI_document_number)[0];
            const CL_row_data = CUSTOMER_LEDGER_SEARCH.filter((el) => el.document_number === TI_document_number);
            log.debug("TI_document_number --- ", TI_document_number);
            log.debug("CL_row_data --- ", CL_row_data);
            log.debug("CL_row_data[0] --- ", CL_row_data[0]);

            let CL_RECORD = record.load({
                type: record_type,
                id: CL_row_data.id
            });

            if(popbill_code === 1) { // 발행 성공
                // a. CUSTOMER_LEDGER에 flag 데이터 (U)
                CL_RECORD.setValue(rowRecord_prefix + 'flag', '2');
                CL_Record.save();

                // b. E_TAX_ESERO 새로운 레코드 생성 (C)
                //    CL_row_data, issueResult 값으로 사용
                setETAXRecord(taxInvoice, CL_row_data) // 팝빌 결과, 개별 매출원장 정보


            } else { // 발행 실패
                 // a. CUSTOMER_LEDGER에 flag 데이터 (U)
                CL_RECORD.setValue(rowRecord_prefix + 'flag', 'F');
                CL_RECORD.setValue(rowRecord_prefix + 'popbill_code', taxInvoice.code);
                CL_RECORD.setValue(rowRecord_prefix + 'popbill_message', taxInvoice.message);
                CL_RECORD.save();
            }

        });

    }

    function setETAXRecord(taxInvoice, CL_row_data) {
        const etax_rec_prefix = 'custrecord_ko_et_';
        let ETAX_RECORD = record.create({
            type: 'customrecord_ko_e_tax_esero',
            isDynamic: true,
        });

        for(let key in CL_row_data) {
            ETAX_RECORD.setValue({
                fieldId: etax_rec_prefix + key,
                value: CL_row_data[key]
            });
        }

        ETAX_RECORD.setValue({
            fieldId: etax_rec_prefix + 'mgt_key',
            value: taxInvoice.invoicerMgtKey
        });

        ETAX_RECORD.setValue({
            fieldId: etax_rec_prefix + 'nts_confirm_num',
            value: taxInvoice.ntsconfirmNum
        });

        ETAX_RECORD.setValue({
            fieldId: etax_rec_prefix + 'issue_dt',
            value: taxInvoice.issueDT
        });        
    }


    async function getBulkSubmitResult( submitID ) {
        try {
            const prefix ='custscript_e_tax_ll_post_';
            const script = runtime.getCurrentScript();

            const ENV = script.getParameter({ name : prefix + 'result_env'});
            const POPBILL_USER_ID = script.getParameter({ name : prefix + 'popbill_user_id'});
            const POPBILL_API_HOST = ENV === 'TEST' ? 'https://popbill-test.linkhub.co.kr' : 'https://popbill.linkhub.co.kr';

            const API_Session_Token = await getToken();
            var headerObj = new Array();
            headerObj['Authorization'] = API_Session_Token;
            headerObj['x-pb-userid'] = POPBILL_USER_ID;
            headerObj['Content-Type'] = 'application/json';
            headerObj['Accept'] = '*/*';


            const res = await https.get({
            url:  `${POPBILL_API_HOST}/Taxinvoice/BULK/${submitID}/State`,
            headers: headerObj
            }); 
            

            log.debug('get 요청 getBulkSubmitResult 함수  res.body ==== ', res.body);
            return JSON.parse(res.body);

        } catch(err) {

            throw error.create({
                name: 'getBulkSubmitResult Fail',
                message: err
            });
        }

    };



    function setTIBulkSubmitLog(rowRecordId, parsedRes) {
        try {
            const prefix = "custrecord_ko_ti_log_"
            let submitLogRecord = record.load({
                type: 'customrecord_ko_ti_sumbit_log',
                id: rowRecordId
            });

            submitLogRecord.setValue(prefix + 'success_cnt', parsedRes.successCount);
            submitLogRecord.setValue(prefix + 'fail_cnt', parsedRes.failCount);
            submitLogRecord.setValue(prefix + 'result_date', new Date());
            submitLogRecord.save();
            log.debug("setTIBulkSubmitLog  submitLogRecord.save() 후 : ",  submitLogRecord.save())
        } catch(err) {
            throw error.create({
                name: 'setTIBulkSubmitLog Fail',
                message: err
            });
        }
    } 



    async function getToken() {
        const prefix ='custscript_e_tax_ll_post_';
        const script = runtime.getCurrentScript();

        const ENV = script.getParameter({ name: prefix + 'result_env' });
        const ACCESS_ID = script.getParameter({ name: prefix + 'access_id' }); // 사업자 번호
        const LINK_ID = script.getParameter({ name: prefix + 'popbill_link_id' });
        const SECRET_KEY = script.getParameter({ name: prefix + 'popbill_s_key' });


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

    function setSearchResult(record_type, prefix) {
        let results = [];

        // let columnsArr = [];
        // for(let col of columns) {
        //     columnsArr.push(rowRecord_prefix + col);
        // };

        const clSearch = search.create({
            type: record_type,
            // columns: columnsArr,
            filters: [[ prefix + 'submit_id', search.Operator.IS, issueResult.submitID ]],
        });

        clSearch.run().each(function(result) {
            log.debug("[CUSTOMER_LEDGER_SEARCH] 안 result ---", result);

            let res = {};
            res.id = result.id;
            res.subsidiary_id = result.getValue(prefix + 'subsidiary_id');
            res.document_number = result.getValue(prefix + 'document_number');
            res.transaction_id = result.getValue(prefix + 'transaction_id');
            res.customer_name = result.getValue(prefix + 'customer_name');
            res.net_amount = result.getValue(prefix + 'net_amount');
            res.amount = result.getValue(prefix + 'amount');
            res.not_tax_amount = result.getValue(prefix + 'not_tax_amount');
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


    return {
        post
    }
});