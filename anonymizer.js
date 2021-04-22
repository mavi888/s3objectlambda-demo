const AWS = require('aws-sdk');
const S3 = new AWS.S3();
const comprehend = new AWS.Comprehend();


const Axios = require('axios');

exports.handler = async (event) => {
    console.log('start the s3 object lambda')

    const objectGetContext = event.getObjectContext;
    const requestRoute = objectGetContext.outputRoute;
    const requestToken = objectGetContext.outputToken;
    const s3URL = objectGetContext.inputS3Url;

    // Get object from S3
    const response = await Axios({
        url : s3URL,
        method: 'GET',
        responseType: 'arraybuffer'
    });

    const data = response.data;
    
    // Transform object
    const pii = await detectPiiEntities(data);

    const cleanText = replacePiiWithBlank(data, pii);
    console.log(cleanText);

    // Write object back to s3 object lambda
    const params = {
        Body : cleanText,
        RequestRoute : requestRoute,
        RequestToken : requestToken
    };

    console.log(params);

    const result = await saveItemS3(params);
    console.log(result);

    return ('status_code', 200);    

}

saveItemS3 = async params => {
    return S3.writeGetObjectResponse(params).promise().then((data) => {
        return data;
    }).catch(error => {
        return error;
    });
}

detectPiiEntities = async text => {
    const params = {
        LanguageCode: 'en',
        Text: text.toString('utf8')
    }

    return comprehend.detectPiiEntities(params).promise().then((data) => {
        return data;
    }).catch(error => {
        return error;
    })
}

replacePiiWithBlank = (data, offsetArray) => {
    const filler = '*****';

    const originalText = data.toString('utf8');
    let cleanText = data.toString('utf8');
    
    offsetArray.Entities.forEach(element => {
        cleanText = replacePiiInline(cleanText, originalText, element.BeginOffset, element.EndOffset);
    });

    return cleanText;
}


replacePiiInline = (modifiedText, originalText, beginOffset, endOffset) => {
    const filler = '*****';

    const pii = originalText.substring(beginOffset, endOffset);
    const newString = modifiedText.replace(pii, filler);
    return newString;
}
