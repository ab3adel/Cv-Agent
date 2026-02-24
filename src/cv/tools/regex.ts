
const actionRegex_2 = /\bACTION\b/i;
const actionRegex_3 =/^ACTION:\s*(SHOW_CV|SHOW_CONTACTS|null|SEND_EMAIL)\s*(?:\nEMAIL_CONTENT:\s*([\s\S]*?))?(?:\nSTATUS:\s*(PENDING|APPROVED))?$/i;
const actionRegex_sendEmail =/^ACTION:\s*SEND_EMAIL\s*(?:\nEMAIL_CONTENT:\s*([\s\S]*?))(?:\nSTATUS:\s*(PENDING|APPROVED))$/i;
export function check_action(response:string){
const match = response.match(actionRegex_2);
return match
}

export function capture_cation(response:string){
const match = response.match(actionRegex_3);
return match
}


export function capture_email(response:string){
const match = response.match(actionRegex_sendEmail);
return match
}