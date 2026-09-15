(function(){
  'use strict';
  var KEY='bookly_language';
  var LANGS=[
    {code:'ru',label:'Русский',dir:'ltr'},
    {code:'en',label:'English',dir:'ltr'},
    {code:'uz',label:'O‘zbek',dir:'ltr'},
    {code:'tr',label:'Türkçe',dir:'ltr'},
    {code:'ar',label:'العربية',dir:'rtl'}
  ];
  var T={
    en:{'back':'Back to Bookly','language':'Language','rules':'Rules of use','privacy':'Privacy','contact':'Contact support','account':'Account','overview':'Overview','businesses':'Businesses','billing':'Billing','booklyProfile':'Bookly profile','profileDesc':'Manage your account and access important information.','supportEmail':'Support email','learnMore':'Learn more'},
    ru:{'back':'Назад в Bookly','language':'Язык','rules':'Правила использования','privacy':'Конфиденциальность','contact':'Поддержка','account':'Аккаунт','overview':'Обзор','businesses':'Бизнесы','billing':'Оплата','booklyProfile':'Профиль Bookly','profileDesc':'Управляйте аккаунтом и открывайте важную информацию.','supportEmail':'Почта поддержки','learnMore':'Подробнее'},
    uz:{'back':'Bookly’ga qaytish','language':'Til','rules':'Foydalanish qoidalari','privacy':'Maxfiylik','contact':'Qo‘llab-quvvatlash','account':'Hisob','overview':'Umumiy ko‘rinish','businesses':'Bizneslar','billing':'To‘lovlar','booklyProfile':'Bookly profili','profileDesc':'Hisobingizni boshqaring va muhim ma’lumotlarni ko‘ring.','supportEmail':'Qo‘llab-quvvatlash emaili','learnMore':'Batafsil'},
    tr:{'back':'Bookly’ye dön','language':'Dil','rules':'Kullanım kuralları','privacy':'Gizlilik','contact':'Destek','account':'Hesap','overview':'Genel bakış','businesses':'İşletmeler','billing':'Faturalandırma','booklyProfile':'Bookly profili','profileDesc':'Hesabınızı yönetin ve önemli bilgilere erişin.','supportEmail':'Destek e-postası','learnMore':'Daha fazla'},
    ar:{'back':'العودة إلى Bookly','language':'اللغة','rules':'قواعد الاستخدام','privacy':'الخصوصية','contact':'الدعم','account':'الحساب','overview':'نظرة عامة','businesses':'الأنشطة','billing':'الفوترة','booklyProfile':'ملف Bookly','profileDesc':'أدر حسابك واطلع على المعلومات المهمة.','supportEmail':'بريد الدعم','learnMore':'معرفة المزيد'}
  };
  function valid(c){return LANGS.some(function(x){return x.code===c;});}
  function getLang(){try{var s=localStorage.getItem(KEY);if(valid(s))return s;}catch(e){} var b=(navigator.language||'').toLowerCase();if(b.indexOf('ru')===0)return'ru';if(b.indexOf('uz')===0)return'uz';if(b.indexOf('tr')===0)return'tr';if(b.indexOf('ar')===0)return'ar';return'en';}
  function setLang(c){if(!valid(c))return;try{localStorage.setItem(KEY,c);}catch(e){} document.documentElement.lang=c;document.documentElement.dir=(c==='ar'?'rtl':'ltr');apply(c);}
  function tr(k){return (T[getLang()]&&T[getLang()][k])||T.en[k]||k;}
  function selector(){
    if(document.getElementById('bookly-web-language'))return;
    var host=document.querySelector('header .nav')||document.querySelector('.nav')||document.querySelector('header');
    if(!host)return;
    var wrap=document.createElement('div');wrap.id='bookly-web-language';wrap.style.cssText='display:inline-flex;align-items:center;margin-left:10px;position:relative;z-index:20;';
    var select=document.createElement('select');select.setAttribute('aria-label',tr('language'));select.style.cssText='height:40px;border:1px solid #e3e6eb;border-radius:11px;background:#fff;color:#202329;padding:0 30px 0 11px;font:inherit;font-size:12px;font-weight:750;cursor:pointer;outline:none;';
    LANGS.forEach(function(x){var o=document.createElement('option');o.value=x.code;o.textContent=x.label;select.appendChild(o);});
    select.value=getLang();select.onchange=function(){setLang(this.value);};wrap.appendChild(select);host.appendChild(wrap);
  }
  function replaceText(oldText,newText){
    var walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    var nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(function(n){if(n.nodeValue&&n.nodeValue.trim()===oldText)n.nodeValue=n.nodeValue.replace(oldText,newText);});
  }
  function apply(c){
    if(!document.body)return;
    document.documentElement.lang=c;document.documentElement.dir=(c==='ar'?'rtl':'ltr');
    selector();
    if(location.pathname.endsWith('/account.html')||location.pathname.endsWith('account.html')){
      var map={
        'Back to Bookly':'back','Account':'account','Overview':'overview','Businesses':'businesses','Billing':'billing','Profile & Support':'profileLabel','Bookly profile':'booklyProfile','Your account, legal information and support.':'profileDesc','Support email:':'supportEmail','Rules of use':'rules','Privacy':'privacy','Contact support':'contact','Learn more':'learnMore'
      };
      Object.keys(map).forEach(function(k){if(T[c]&&T[c][map[k]])replaceText(k,T[c][map[k]]);});
    }
    if(location.pathname.endsWith('/rules.html')||location.pathname.endsWith('rules.html')){
      replaceText('Rules of Use',c==='ru'?'Правила использования':c==='uz'?'Foydalanish qoidalari':c==='tr'?'Kullanım kuralları':c==='ar'?'قواعد الاستخدام':'Rules of Use');
      replaceText('Back to Bookly',tr('back'));
    }
  }
  window.BooklyWebI18n={LANGS:LANGS,getLang:getLang,setLang:setLang,apply:apply,tr:tr};
  function start(){selector();apply(getLang());}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
