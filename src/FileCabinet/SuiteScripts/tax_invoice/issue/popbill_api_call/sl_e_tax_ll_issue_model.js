//-----------------------------------------------------------------------------------------------------------
// Create Date  : 20231027
// Last Updated : 20231027
// Authors      : YHKIM <Wilus Inc.>
// Application  : Tax Invoice - Popbill 대량 요청 및 요청 결과 처리
// Purpose      : 
// Update Desc. : 
//-----------------------------------------------------------------------------------------------------------

/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define(['N/search', 'N/record', 'N/error', 'N/runtime'],

    (search, record, error, runtime) => {

        const entry = (params, method) => {
            if (method === 'GET') {
                return new getModel(params);
            } else {
                return new postModel(params);
            }
        }

        function getModel(params) {
            
            const prefix = 'custrecord_ko_cl_'; // NetSuite > Record > CUSTOMER_LEDGER
            let filters = [];

            /**
             * 
            */
            
            /* status 필터 생성 */
            filters.push( [prefix + 'status' , search.Operator.EQUALTO, 1] );
            
            /* transaction_id 필터 생성 */
            if (params.array) {
                let paramArray = params.array;
                paramArray = JSON.parse(paramArray);
                log.debug('paramArray --- ', JSON.stringify(paramArray));

                var transactionFilters = [];
                for (var obj of paramArray) {

                    if (obj.transaction_id !== '') {
                        transactionFilters.push([prefix + 'transaction_id', search.Operator.IS, obj.transaction_id]);
                        transactionFilters.push('or')
                    }
                }
                transactionFilters.pop();
                filters.push(transactionFilters);

                /* Invoice number가 ''인 것만 조회 */
                filters.push('and');
                filters.push([prefix + 'invoice_number', search.Operator.ISNOTEMPTY, '']);
            }


            log.debug('Filter Details', transactionFilters); // 필터정보

            /* transaction_id 를 DESC 하기 위한 컬럼변수 */
            const tranIdCol = search.createColumn({
                name: prefix + 'transaction_id',
                sort: search.Sort.DESC
            });

            // execution Customer_Ledger record search
            const clSearch = search.create({
                type: search.Type.CUSTOM_RECORD + CL_RECORD_ID,
                columns: [
                    prefix + 'tax_rate',
                    prefix + 'customer_number',
                    prefix + 'customer_name',
                    prefix + 'net_amount',
                    prefix + 'amount',
                    prefix + 'not_tax_amount',
                    prefix + 'tax_amount',
                    prefix + 'tax_code',
                    prefix + 'service_tax_date',
                    prefix + 'invoice_number',
                    prefix + 'department_id',
                    prefix + 'class',
                    prefix + 'location',
                    prefix + 'transaction_type',
                    prefix + 'date_tax_point',
                    prefix + 'subsidiary_id',
                    tranIdCol,  // transaction_id 를 DESC 하기 위한 컬럼변수
                    prefix + 'document_number',
                    prefix + 'memo',
                    prefix + 'posting',
                    prefix + 'flag',
                    prefix + 'popbill_code',
                    prefix + 'popbill_message',
                    prefix + 'status',
                ],
                filters: transactionFilters
            });

            let results = [];
            let index = 0;
            clSearch.run().each(function (result) {
                if (result.getValue(prefix + 'invoice_number') === '') {
                    let res = {};
                    res.custlist_index = index + 1;
                    res.custlist_document_number = result.getValue(prefix + 'document_number');
                    res.custlist_transaction_id = result.getValue(prefix + 'transaction_id');
                    res.custlist_customer_name = result.getValue(prefix + 'customer_name');
                    res.custlist_net_amount = result.getValue(prefix + 'net_amount');
                    if (result.getValue(prefix + 'amount') !== '' || parseInt(result.getValue(prefix + 'amount')) === 0)
                        res.custlist_amount = result.getValue(prefix + 'amount');
                    else
                        res.custlist_amount = result.getValue(prefix + 'not_tax_amount');
                    res.custlist_tax_amount = result.getValue(prefix + 'tax_amount');
                    res.custlist_tax_code = switchTaxCode(result.getValue(prefix + 'tax_code'), search);
                    res.custlist_service_tax_date = result.getValue(prefix+'service_tax_date');
                    res.popbill_code = result.getValue(prefix+'popbill_code');
                    res.popbill_message = result.getValue(prefix+'popbill_message');
                    res.custlist_service_tax_date = params.std;
                    res.custlist_popbill_code = "";
                    res.custlist_popbill_massage = "";
                    res.custlist_status = '대기중';
                    results.push(res);
                    index++;
                }
                return true;
            });

            log.debug({title: 'results', details: JSON.stringify(results)})

            /* View에서 사용될 변수 results */
            this.results = results;
            if (!params.array) this.results = '';

        }
      
        const switchTaxCode = (tax_code, search) => {
            let taxCode_Map = getTaxCode(search);
            let tax_string = null;

            switch (tax_code) {
                case taxCode_Map.get('S-KR') :
                    tax_string = "S-KR";
                    break;
                case taxCode_Map.get('SO-KR') :
                    tax_string = "SO-KR";
                    break;
                case taxCode_Map.get('SP-KR') :
                    tax_string = "SP-KR";
                    break;
                case taxCode_Map.get('Z-KR') :
                    tax_string = "Z-KR";
                    break;
                /*case taxCode_Map.get('ZO-KR') :
                    tax_string = "ZO-KR";
                    break;*/
                case taxCode_Map.get('EX-KR') :
                    tax_string = "EX-KR";
                    break;
                case taxCode_Map.get('UNDEF-KR') :
                    tax_string = "UNDEF-KR";
                    break;
                default :
                    tax_string = '';
            }
            return tax_string;
        }

        function getTaxCode(search) {
            let taxCode_Map = new Map();
            const tcSearch = search.create({
                type: 'salestaxitem',
                columns: ['itemid', 'internalid'],
                filters: []
            });
            const tcSearchSet = tcSearch.runPaged({pageSize: 1000}).fetch({index: 0});
            tcSearchSet.data.forEach(function (result) {
                taxCode_Map.set(result.getValue('itemid'), result.getValue('internalid'));
            });
            return taxCode_Map;
        }

        return {load: entry}

    });
