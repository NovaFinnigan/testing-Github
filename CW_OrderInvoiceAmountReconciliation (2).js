/**
 * Created by vxjayakumar on 4/3/2016.
 */

//var EMAIL_SEND_FROM = 5075582; // Prod
var EMAIL_SEND_FROM = 2668605;
var SEND_DL = 'vijaykumar.jayakumar@xpo.com';//,moni.mathew@xpo.com,alan.mcivor@xpo.com,ITFREIGHTOMSINTEGRATIONTEAM@con-way.com';
var SEPARATOR = ' , ';

function main(request,response){
    var orders = [],
        count = 1000,
        min = 0,
        max = 1000,
        resultSet,
        rs,
        searchObj = null;
    var flts = [],cols = [],dateFilter;
    if (request.getParameter('date')){
        dateFilter = request.getParameter('date');
    } else{
        var priorDay = new Date(new Date() - 1000*86400);
        dateFilter = nlapiDateToString(priorDay);
    }
    nlapiLogExecution('DEBUG', 'Starting Validation *****','For date :' + dateFilter);
    flts.push(new nlobjSearchFilter('lastmodifieddate', null, 'after', dateFilter));
    flts.push(new nlobjSearchFilter('custbody_cw_order_status', null, 'anyof', '7')); // Only Rated Status
    flts.push(new nlobjSearchFilter('mainline', null, 'is', 'T')); // Only Rated Status
    cols.push(new nlobjSearchColumn('internalid'));
    cols.push(new nlobjSearchColumn('amount'));
    cols.push(new nlobjSearchColumn('custbody_cw_disppronos'));
    searchObj = nlapiCreateSearch('salesorder', flts, cols);
    rs = searchObj.runSearch();
    while (count == 1000) {
        resultSet = rs.getResults(min, max);
        orders = orders.concat(resultSet);
        min = max;
        max += 1000;
        count = resultSet.length;
    }
    // Get only List of orders
    var orderIds = orders.map(function(x){return x.getValue('internalid')});

    // Get invoice amounts
    if (orderIds && orderIds.length > 0){
        var invoices = [],
            count = 1000,
            min = 0,
            max = 1000,
            invResultSet,
            invRS,
            searchObj = null;
        var flts = [], cols = [];
        flts.push(new nlobjSearchFilter('internalid','custbody_cw_corr_order_link_quote', 'anyof', orderIds));
        flts.push(new nlobjSearchFilter('mainline','custbody_cw_corr_order_link_quote', 'is','T'));
        flts.push(new nlobjSearchFilter('mainline', null, 'is', 'T'));
        cols.push(new nlobjSearchColumn('internalid','custbody_cw_corr_order_link_quote','group'));
        cols[0].setSort();
        cols.push(new nlobjSearchColumn('amount',null,'sum'));
        cols.push(new nlobjSearchColumn('custbody_cw_disppronos',null,'max'));
        searchObj = nlapiCreateSearch('invoice', flts, cols);
        invRS = searchObj.runSearch();
        while (count == 1000) {
            invResultSet = invRS.getResults(min, max);
            invoices = invoices.concat(invResultSet);
            min = max;
            max += 1000;
            count = resultSet.length;
        }
        var invOrderIds = invoices.map(function(x){return x.getValue('internalid','custbody_cw_corr_order_link_quote','group')});
        var invAmt= 0,orderAmt= 0,intId,pro,body,arr=[];
        for (var i=0; i < orders.length; i++){
            orderAmt = parseFloat(orders[i].getValue('amount'));
            intId = orders[i].getValue('internalid');
            pro = orders[i].getValue('custbody_cw_disppronos');
            var idx = invOrderIds.indexOf(intId);

            if (idx != -1){
                invAmt = parseFloat(invoices[idx].getValue('amount',null,'sum'));
            } else {
                invAmt = 0;
            }
            if (invAmt != orderAmt){
                arr.push(intId + SEPARATOR + pro + SEPARATOR + invAmt + SEPARATOR + 'not same as' + SEPARATOR + orderAmt);
                //console.log(intId + ' ' + pro + ':' + invAmt + 'not same as' + orderAmt);//Error
            } else {
                //console.log(intId + ' ' + pro + ':' + invAmt + 'same as' + orderAmt); // Matched
            }
        }if (invAmt != orderAmt){
            arr.push(intId + SEPARATOR + pro + SEPARATOR + invAmt + SEPARATOR + 'not same as' + SEPARATOR + orderAmt);
            //console.log(intId + ' ' + pro + ':' + invAmt + 'not same as' + orderAmt);//Error
        } else {
            //console.log(intId + ' ' + pro + ':' + invAmt + 'same as' + orderAmt); // Matched
        }//hello world//
        //hello world//
        body = arr.join('\n');
        var userEmail = nlapiGetContext().getEmail();
        SEND_DL = userEmail ? userEmail : SEND_DL;
        nlapiSendEmail(EMAIL_SEND_FROM, SEND_DL, 'Netsuite: Invoice Amount and Order Amount Mismatches',body);
    }
    nlapiLogExecution('DEBUG', 'End Validation *****','For date :' + dateFilter);
}
