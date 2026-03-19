import crypto from "crypto"

export async function EncryptData(data)
{
    const key = "aboiefgxijslmnbp";
    const iv = "ZCGODGEW";
    const cipher = crypto.createCipheriv("des-ede-cbc", key, iv);
    let encrypted = cipher.update(data, "utf8", "base64");
    encrypted += cipher.final("base64");
    return encrypted;
}