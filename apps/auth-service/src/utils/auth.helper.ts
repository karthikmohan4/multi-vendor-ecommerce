import crypto from "crypto";
import { validationError } from "../../../../packages/error-handler";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validationRegistartionData = (data:any,userType:"user"|"seller")=>{
    const {name, email, password, phone_number, country} = data;
    if(!name || !email || !password || (userType=="seller" && (!phone_number || !country)))
        {
        return new validationError('Missing required fields')
    }
    if(!emailRegex.test(email)){
        return new validationError('Invalid email format');
    }
}