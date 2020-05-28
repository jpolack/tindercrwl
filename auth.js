const fetch = require('node-fetch');

const reAuthenticate = async (twoFaCode) => {
  const refreshRes = await fetch(
    'https://api.gotinder.com/v2/auth/sms/validate?auth_type=sms',
    {
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({
        otp_code: twoFaCode,
        phone_number: process.env.PHONE,
      }),
    },
  );

  if (refreshRes.status >= 400 && refreshRes.status < 500) {
    console.log('Alredy used that code');
    return undefined;
  }

  const refresh = await refreshRes.json();

  const authRes = await fetch('https://api.gotinder.com/v2/auth/login/sms', {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify({
      refresh_token: refresh.data.refresh_token,
    }),
  });

  const auth = await authRes.json();

  console.log('New API TOKEN', auth.data.api_token);

  return auth.data.api_token;
};

module.exports = {
  reAuthenticate,
};
