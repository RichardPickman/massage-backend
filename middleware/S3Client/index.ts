import { S3Client } from '@aws-sdk/client-s3';
import { getBucketConfig } from '../../config';


const { accesskey, secretkey, region } = getBucketConfig();

const client = new S3Client({
    region: region,
    credentials: {
        accessKeyId: accesskey,
        secretAccessKey: secretkey,
    }
});

export default client;
