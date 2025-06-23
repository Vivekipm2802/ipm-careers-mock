export function getTestTemplate(first_name,test_name,link){
    return `<!--
    * This email was built using Tabular.
    * For more information, visit https://tabular.email
    -->
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
    <head>
    <title></title>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <!--[if !mso]>-->
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <!--<![endif]-->
    <meta name="x-apple-disable-message-reformatting" content="" />
    <meta content="target-densitydpi=device-dpi" name="viewport" />
    <meta content="true" name="HandheldFriendly" />
    <meta content="width=device-width" name="viewport" />
    <meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no" />
    <style type="text/css">
    table {
    border-collapse: separate;
    table-layout: fixed;
    mso-table-lspace: 0pt;
    mso-table-rspace: 0pt
    }
    table td {
    border-collapse: collapse
    }
    .ExternalClass {
    width: 100%
    }
    .ExternalClass,
    .ExternalClass p,
    .ExternalClass span,
    .ExternalClass font,
    .ExternalClass td,
    .ExternalClass div {
    line-height: 100%
    }
    body, a, li, p, h1, h2, h3 {
    -ms-text-size-adjust: 100%;
    -webkit-text-size-adjust: 100%;
    }
    html {
    -webkit-text-size-adjust: none !important
    }
    body, #innerTable {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale
    }
    #innerTable img+div {
    display: none;
    display: none !important
    }
    img {
    Margin: 0;
    padding: 0;
    -ms-interpolation-mode: bicubic
    }
    h1, h2, h3, p, a {
    line-height: inherit;
    overflow-wrap: normal;
    white-space: normal;
    word-break: break-word
    }
    a {
    text-decoration: none
    }
    h1, h2, h3, p {
    min-width: 100%!important;
    width: 100%!important;
    max-width: 100%!important;
    display: inline-block!important;
    border: 0;
    padding: 0;
    margin: 0
    }
    a[x-apple-data-detectors] {
    color: inherit !important;
    text-decoration: none !important;
    font-size: inherit !important;
    font-family: inherit !important;
    font-weight: inherit !important;
    line-height: inherit !important
    }
    u + #body a {
    color: inherit;
    text-decoration: none;
    font-size: inherit;
    font-family: inherit;
    font-weight: inherit;
    line-height: inherit;
    }
    a[href^="mailto"],
    a[href^="tel"],
    a[href^="sms"] {
    color: inherit;
    text-decoration: none
    }
    img,p{margin:0;Margin:0;font-family:Fira Sans,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:26px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;letter-spacing:0;direction:ltr;color:#9095a2;text-align:left;mso-line-height-rule:exactly;mso-text-raise:3px}h1{margin:0;Margin:0;font-family:Fira Sans,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:52px;font-weight:700;font-style:normal;font-size:48px;text-decoration:none;text-transform:none;letter-spacing:0;direction:ltr;color:#000;text-align:left;mso-line-height-rule:exactly;mso-text-raise:1px}h2{margin:0;Margin:0;font-family:Fira Sans,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:30px;font-weight:700;font-style:normal;font-size:24px;text-decoration:none;text-transform:none;letter-spacing:0;direction:ltr;color:#333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px}h3{margin:0;Margin:0;font-family:Fira Sans,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:26px;font-weight:700;font-style:normal;font-size:20px;text-decoration:none;text-transform:none;letter-spacing:0;direction:ltr;color:#333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px}
    </style>
    <style type="text/css">
    @media (min-width: 481px) {
    .hd { display: none!important }
    }
    </style>
    <style type="text/css">
    @media (max-width: 480px) {
    .hm { display: none!important }
    }
    </style>
    <style type="text/css">
    @media (min-width: 481px) {
    h2,h3{color:#333;mso-text-raise:2px}img,p{margin:0;Margin:0;font-family:Fira Sans,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:28px;font-weight:400;font-style:normal;font-size:18px;text-decoration:none;text-transform:none;letter-spacing:0;direction:ltr;color:#9095a2;text-align:left;mso-line-height-rule:exactly;mso-text-raise:3px}h1,h2,h3{margin:0;Margin:0;font-family:Fira Sans,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;font-weight:700;font-style:normal;text-decoration:none;text-transform:none;letter-spacing:0;direction:ltr;text-align:left;mso-line-height-rule:exactly}h1{line-height:52px;font-size:48px;color:#000;mso-text-raise:1px}h2{line-height:30px;font-size:24px}h3{line-height:26px;font-size:20px}.t21{padding-bottom:37px!important;width:514px!important}.t13,.t19{width:475px!important}.t3{mso-line-height-alt:18px!important;line-height:18px!important}.t1{width:416px!important}.t11{mso-line-height-alt:40px!important;line-height:40px!important}.t9{padding-bottom:40px!important;width:475px!important}.t8{line-height:27px!important;font-size:22px!important;mso-text-raise:2px!important}.t12,.t15{line-height:28px!important}.t15{mso-line-height-alt:28px!important}.t12{font-size:18px!important}.t16,.t17{line-height:48px!important;mso-text-raise:11px!important}.t16{font-size:13px!important}
    }
    </style>
    <style type="text/css">@media (min-width: 481px) {[class~="x_t21"]{padding-bottom:37px!important;width:514px!important;} [class~="x_t19"]{width:475px!important;} [class~="x_t3"]{mso-line-height-alt:18px!important;line-height:18px!important;} [class~="x_t1"]{width:416px!important;} [class~="x_t11"]{mso-line-height-alt:40px!important;line-height:40px!important;} [class~="x_t9"]{padding-bottom:40px!important;width:475px!important;} [class~="x_t8"]{line-height:27px!important;font-size:22px!important;mso-text-raise:2px!important;} [class~="x_t15"]{mso-line-height-alt:28px!important;line-height:28px!important;} [class~="x_t13"]{width:475px!important;} [class~="x_t12"]{line-height:28px!important;font-size:18px!important;} [class~="x_t17"]{line-height:48px!important;mso-text-raise:11px!important;} [class~="x_t16"]{line-height:48px!important;font-size:13px!important;mso-text-raise:11px!important;}}</style>
    <style type="text/css" media="screen and (min-width:481px)">.moz-text-html img,.moz-text-html p{margin:0;Margin:0;font-family:Fira Sans,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:28px;font-weight:400;font-style:normal;font-size:18px;text-decoration:none;text-transform:none;letter-spacing:0;direction:ltr;color:#9095a2;text-align:left;mso-line-height-rule:exactly;mso-text-raise:3px}.moz-text-html h1{margin:0;Margin:0;font-family:Fira Sans,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:52px;font-weight:700;font-style:normal;font-size:48px;text-decoration:none;text-transform:none;letter-spacing:0;direction:ltr;color:#000;text-align:left;mso-line-height-rule:exactly;mso-text-raise:1px}.moz-text-html h2{margin:0;Margin:0;font-family:Fira Sans,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:30px;font-weight:700;font-style:normal;font-size:24px;text-decoration:none;text-transform:none;letter-spacing:0;direction:ltr;color:#333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px}.moz-text-html h3{margin:0;Margin:0;font-family:Fira Sans,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:26px;font-weight:700;font-style:normal;font-size:20px;text-decoration:none;text-transform:none;letter-spacing:0;direction:ltr;color:#333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px}.moz-text-html .t21{padding-bottom:37px!important;width:514px!important}.moz-text-html .t19{width:475px!important}.moz-text-html .t3{mso-line-height-alt:18px!important;line-height:18px!important}.moz-text-html .t1{width:416px!important}.moz-text-html .t11{mso-line-height-alt:40px!important;line-height:40px!important}.moz-text-html .t9{padding-bottom:40px!important;width:475px!important}.moz-text-html .t8{line-height:27px!important;font-size:22px!important;mso-text-raise:2px!important}.moz-text-html .t15{mso-line-height-alt:28px!important;line-height:28px!important}.moz-text-html .t13{width:475px!important}.moz-text-html .t12{line-height:28px!important;font-size:18px!important}.moz-text-html .t17{line-height:48px!important;mso-text-raise:11px!important}.moz-text-html .t16{line-height:48px!important;font-size:13px!important;mso-text-raise:11px!important}</style>
    <!--[if !mso]>-->
    <link href="https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;700&amp;family=Montserrat:wght@800&amp;display=swap" rel="stylesheet" type="text/css" />
    <!--<![endif]-->
    <!--[if mso]>
    <style type="text/css">
    img,p{margin:0;Margin:0;font-family:Fira Sans,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:28px;font-weight:400;font-style:normal;font-size:18px;text-decoration:none;text-transform:none;letter-spacing:0;direction:ltr;color:#9095a2;text-align:left;mso-line-height-rule:exactly;mso-text-raise:3px}h1{margin:0;Margin:0;font-family:Fira Sans,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:52px;font-weight:700;font-style:normal;font-size:48px;text-decoration:none;text-transform:none;letter-spacing:0;direction:ltr;color:#000;text-align:left;mso-line-height-rule:exactly;mso-text-raise:1px}h2{margin:0;Margin:0;font-family:Fira Sans,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:30px;font-weight:700;font-style:normal;font-size:24px;text-decoration:none;text-transform:none;letter-spacing:0;direction:ltr;color:#333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px}h3{margin:0;Margin:0;font-family:Fira Sans,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:26px;font-weight:700;font-style:normal;font-size:20px;text-decoration:none;text-transform:none;letter-spacing:0;direction:ltr;color:#333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px}td.t21{padding-bottom:37px !important}div.t3{mso-line-height-alt:18px !important;line-height:18px !important}div.t11{mso-line-height-alt:40px !important;line-height:40px !important}td.t9{padding-bottom:40px !important}h1.t8{line-height:27px !important;font-size:22px !important;mso-text-raise:2px !important}div.t15{mso-line-height-alt:28px !important;line-height:28px !important}p.t12{line-height:28px !important;font-size:18px !important}td.t17{line-height:48px !important;mso-text-raise:11px !important}a.t16{line-height:48px !important;font-size:13px !important;mso-text-raise:11px !important}
    </style>
    <![endif]-->
    <!--[if mso]>
    <xml>
    <o:OfficeDocumentSettings>
    <o:AllowPNG/>
    <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
    </xml>
    <![endif]-->
    </head>
    <body id="body" class="t25" style="min-width:100%;Margin:0px;padding:0px;background-color:#EDEDED;"><div class="t24" style="background-color:#EDEDED;"><table width="100%" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td class="t23" style="font-size:0;line-height:0;mso-line-height-rule:exactly;background-color:#EDEDED;" valign="top" align="center">
    <!--[if mso]>
    <v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false">
    <v:fill color="#EDEDED"/>
    </v:background>
    <![endif]-->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" align="center" id="innerTable"><tr><td align="center">
    <table class="t22" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
    <tr>
    <!--[if mso]>
    <td width="574" class="t21" style="background-color:#FFFFFF;overflow:hidden;padding:60px 30px 70px 30px;border-radius:20px 20px 20px 20px;">
    <![endif]-->
    <!--[if !mso]>-->
    <td class="t21" style="background-color:#FFFFFF;overflow:hidden;width:420px;padding:60px 30px 70px 30px;border-radius:20px 20px 20px 20px;">
    <!--<![endif]-->
    <table width="100%" cellpadding="0" cellspacing="0" style="width:100%!important;"><tr><td align="center">
    <table class="t20" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
    <tr>
    <!--[if mso]>
    <td width="475" class="t19">
    <![endif]-->
    <!--[if !mso]>-->
    <td class="t19" style="width:420px;">
    <!--<![endif]-->
    <table width="100%" cellpadding="0" cellspacing="0" style="width:100%!important;"><tr><td align="center">
    <table id="logo" class="t2" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
    <tr>
    <!--[if mso]>
    <td width="416" class="t1">
    <![endif]-->
    <!--[if !mso]>-->
    <td class="t1" style="width:40px;">
    <!--<![endif]-->
    <div style="font-size:0px;"><img class="t0" style="display:block;border:0;height:auto;width:100%;Margin:0;max-width:100%;" width="416" height="99.125" alt="" src="https://www.ipmcareer.com/wp-content/uploads/2022/02/logo-final-1-2048x488.png"/></div></td>
    </tr></table>
    </td></tr><tr><td><div class="t3" style="mso-line-height-rule:exactly;mso-line-height-alt:50px;line-height:50px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr><tr><td align="center">
    <table class="t6" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
    <tr>
    <!--[if mso]>
    <td width="267" class="t5">
    <![endif]-->
    <!--[if !mso]>-->
    <td class="t5" style="width:267px;">
    <!--<![endif]-->
    <div style="font-size:0px;"><img class="t4" style="display:block;border:0;height:auto;width:100%;Margin:0;max-width:100%;" width="267" height="267" alt="" src="https://www.ipmcareer.com/wp-content/uploads/2024/07/5891-scaled.jpg"/></div></td>
    </tr></table>
    </td></tr><tr><td><div class="t7" style="mso-line-height-rule:exactly;mso-line-height-alt:45px;line-height:45px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr><tr><td align="center">
    <table class="t10" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
    <tr>
    <!--[if mso]>
    <td width="475" class="t9" style="border-bottom:1px solid #E1E2E6;padding:0 0 30px 0;">
    <![endif]-->
    <!--[if !mso]>-->
    <td class="t9" style="border-bottom:1px solid #E1E2E6;width:420px;padding:0 0 30px 0;">
    <!--<![endif]-->
    <h1 class="t8" style="margin:0;Margin:0;font-family:Fira Sans,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:38px;font-weight:700;font-style:normal;font-size:28px;text-decoration:none;text-transform:none;direction:ltr;color:#000000;text-align:center;mso-line-height-rule:exactly;mso-text-raise:3px;">Hi ${first_name}, You have successfully completed our ${test_name}</h1></td>
    </tr></table>
    </td></tr><tr><td><div class="t11" style="mso-line-height-rule:exactly;mso-line-height-alt:30px;line-height:30px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr><tr><td align="center">
    <table class="t14" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
    <tr>
    <!--[if mso]>
    <td width="475" class="t13">
    <![endif]-->
    <!--[if !mso]>-->
    <td class="t13" style="width:420px;">
    <!--<![endif]-->
    <p class="t12" style="margin:0;Margin:0;font-family:Fira Sans,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:26px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;direction:ltr;color:#9095A2;text-align:center;mso-line-height-rule:exactly;mso-text-raise:3px;">We have generated the result along with the explanations &amp; solutions of all the questions , you may access your result using button below.</p></td>
    </tr></table>
    </td></tr><tr><td><div class="t15" style="mso-line-height-rule:exactly;mso-line-height-alt:18px;line-height:18px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr><tr><td align="center">
    <table class="t18" cellpadding="0" cellspacing="0" style="Margin-left:auto;Margin-right:auto;">
    <tr>
    <!--[if mso]>
    <td width="246" class="t17" style="background-color:#833589;overflow:hidden;text-align:center;line-height:46px;mso-line-height-rule:exactly;mso-text-raise:10px;border-radius:40px 40px 40px 40px;">
    <![endif]-->
    <!--[if !mso]>-->
    <td class="t17" style="background-color:#833589;overflow:hidden;width:246px;text-align:center;line-height:46px;mso-line-height-rule:exactly;mso-text-raise:10px;border-radius:40px 40px 40px 40px;">
    <!--<![endif]-->
    <a class="t16" href="${link}" style="display:block;margin:0;Margin:0;font-family:Montserrat,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:46px;font-weight:800;font-style:normal;font-size:12px;text-decoration:none;text-transform:uppercase;letter-spacing:0.5px;direction:ltr;color:#FFFFFF;text-align:center;mso-line-height-rule:exactly;mso-text-raise:10px;" target="_blank">VIEW YOUR ANALYSIS</a></td>
    </tr></table>
    </td></tr></table></td>
    </tr></table>
    </td></tr></table></td>
    </tr></table>
    </td></tr></table></td></tr></table></div></body>
    </html>`
}