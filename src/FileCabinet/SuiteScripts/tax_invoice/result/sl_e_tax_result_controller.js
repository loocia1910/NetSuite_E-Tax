//-----------------------------------------------------------------------------------------------------------
// Create Date  : 20210112
// Last Updated : 20210112
// Authors      : JHCHO, Wilus Inc.
// Application  : E-Tax CSV File Download
// Purpose      : E-Tax CSV File Download Entry Point (Controller)
// Update Desc. : E-TAX (Standard Program) 기준 프로그램 관리 목적의 E-TAX (Standard Program) 프로그램 생성
//-----------------------------------------------------------------------------------------------------------

/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
const PAGE_SIZE = 1000;
const ES_RECORD_ID = '_ko_e_tax_esero';
define(['./sl_e_tax_result_model', './sl_e_tax_result_view'],
    
    (model, view) => {

        const onRequest = (context) => {

            const method = context.request.method;
            const params = context.request.parameters;
            log.debug({title: 'Controller onRequest Method', details: method})

            const m = model.load(params);
            const v = view.load(m);

            context.response.writePage(v.form);
        }

        return {onRequest}

    });
