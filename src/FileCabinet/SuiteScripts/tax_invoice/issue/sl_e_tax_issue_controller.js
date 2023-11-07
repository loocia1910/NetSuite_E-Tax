//-----------------------------------------------------------------------------------------------------------
// Create Date  : 20210112
// Last Updated : 20210112
// Authors      : JHCHO, Wilus Inc.
// Application  : E-Tax Invoice Issuance
// Purpose      : Invoice Issuance Entry Point (Controller)
// Update Desc. : 
//-----------------------------------------------------------------------------------------------------------
// NetSuite ScripName/ScriptId : E-TAX Tax Invoice Issue_popbill / customscript_sl_e_tax_issue_controller
// NetSuite DeploymentID : 	customdeploy_e_tax_issue_popbill
//-----------------------------------------------------------------------------------------------------------




/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
const PAGE_SIZE = 1000;
const CL_RECORD_ID = '_ko_customer_ledger';
define(['./sl_e_tax_issue_model', './sl_e_tax_issue_view'],
    
    (model, view) => {
        const onRequest = (context) => {
            const method = context.request.method;
            const params = context.request.parameters
            log.debug({title: 'Controller onRequest Method', details: method})

            if(method === 'GET'){
                const m = model.load(params, method)
                const v = view.load(m)

                context.response.writePage(v.form);

            }else if(method === 'POST'){
                const m = model.load(params, method)
            }
        }

        return {onRequest}

    });
