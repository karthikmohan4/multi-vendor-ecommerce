import crypto from "crypto";
import { ValidationError } from "../../../../packages/error-handler";
import redis from "../../../../packages/libs/redis";
import { sendEmail } from "./sendMail";
import { NextFunction } from "express";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateRegistrationData = (data: any,userType: "user" | "seller" ) => {
  const { name, email, password, phone_number, country } = data;
  if (
    !name ||
    !email ||
    !password ||
    (userType == "seller" && (!phone_number || !country))
  ) {
    return new ValidationError("Missing required fields");
  }
  if (!emailRegex.test(email)) {
    throw new ValidationError("Invalid email format");
  }
};

export const checkOtpRestrictions = async (
  email: string,
  next: NextFunction
) => {
  if (await redis.get(`otp_lock: ${email}`)) {
    return next(
      new ValidationError(
        "Account locked due to multiple failed attempts! Try after 30 minutes"
      )
    );
  }
  if (await redis.get(`otp_spam_lock:${email}`)) {
    return next(
      new ValidationError(
        "Too many otp requests! Please wait 1 hour for requesting again"
      )
    );
  }

  if(await redis.get(`otp_cooldown:${email}`)){
    return next(new ValidationError("Please wait 1 minute before requesting a new OTP!"));
  }
};

export const sendOtp = async (
  name: string,
  email: string,
  template: string
) => {
  const otp = crypto.randomInt(1000, 9999).toString();
  await sendEmail(email, "Verify your email", template, { name, otp });
  await redis.set(`otp:${email}`, otp, "EX", 300);
  await redis.set(`otp_cooldown:${email}`, "true", "EX", 60);
};

export const trackOtpRequests = async(email:string,next:NextFunction)=>{
  const otprequestKey = `otp_request_count:${email}`;
  let otpRequests = parseInt((await redis.get(otprequestKey)) || "0");
  if(otpRequests>=2){
    await redis.set(`otp_spam_lock:${email}`,"locked","EX",3600); //lock for 1 hour
    return next(new ValidationError("Too many otp requests. Please nwait 1 hour before requestiing"));
  }
  await redis.set(otprequestKey,otpRequests+1,"EX",3600); //tracking requests

}