const crypto = require('crypto');

const { BlobServiceClient } = require('@azure/storage-blob');

const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_STORAGE_CONTAINER_NAME);
const streamifier = require('streamifier');


function generateUniqueName(originalName) {
    // Generate a random string
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    // Append it to the original filename
    return `${Date.now()}-${uniqueSuffix}-${originalName}`;
}

async function uploadFileToBlob(fileStream, originalName) {
    const uniqueBlobName = generateUniqueName(originalName);

    const blockBlobClient = containerClient.getBlockBlobClient(uniqueBlobName);
    const stream = streamifier.createReadStream(fileStream);

    await blockBlobClient.uploadStream(stream);

    return { fileUrl: blockBlobClient.url, uniqueName: uniqueBlobName };
}

async function downloadBlob(blobUrl) {
    // Extract the blob name from the URL
    const urlParts = new URL(blobUrl);
    const blobName = urlParts.pathname.split('/').pop();

    const blobClient = containerClient.getBlobClient(blobName);
    const downloadBlockBlobResponse = await blobClient.download(0);
    return downloadBlockBlobResponse.readableStreamBody;
}


module.exports = {
    uploadFileToBlob,
    downloadBlob,
};
