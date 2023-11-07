//-----------------------------------------------------------------------------------------------------------
// Create Date  : 20210112
// Last Updated : 20210112
// Authors      : JHCHO <Wilus Inc.>
// Application  : E-Tax Invoice Issuance Status Checking
// Purpose      : E-TAX (Standard Program) 기준 프로그램 관리 목적의 E-TAX (Standard Program) 프로그램 생성
//-----------------------------------------------------------------------------------------------------------
// NetSuite ScripName/ScriptId : E-TAX Tax Invoice ll Issue_popbill / customscript_e_tax_ll_issue
// NetSuite DeploymentID : 	customdeploy_e_tax_ll_issue
//-----------------------------------------------------------------------------------------------------------


/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
const CL_RECORD_ID = '_ko_customer_ledger';
define(['./sl_e_tax_ll_issue_model', './sl_e_tax_ll_issue_view'],
    
    (model, view) => {

        const onRequest = (context) => {
            const method = context.request.method;
            const params = context.request.parameters;
            log.debug({title: 'Controller onRequest Method', details: method});

            if(method === 'GET'){
                const m = model.load(params, method);
                const v = view.load(m);

                context.response.writePage(v.list);
            }
        }

        return {onRequest}

    });
