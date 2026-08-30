// Keep service currency selection focused on currencies users can actually use for prices.
// Intl.supportedValuesOf('currency') may include historical codes, fund units,
// precious metals, and accounting/index units. Bookly services should expose
// ordinary current transaction currencies only.
const blockedCurrencyCodes = new Set([
  // Historical / replaced currencies commonly surfaced by ICU data.
  'ALK','AOK','AON','AOR','ARP','AFA','BYB','BRE','BGJ','BGK','BOP','BRB','BUK',
  'CSJ','GHC','GNS','GNE','GWE','ISJ','ILP','ILR','LAJ','LSM','MVQ','MTP','MXP',
  'MRO','MZM','MZE','NIC','PEH','ROK','RHD','SDP','STD','UGS','UGW','SUR','UYP',
  'UYN','VNC','YUD','ZWC','BYR','EEK','LVL','LTL','MTL','CYP','SKK','SIT','RUR',
  'ROL','TRL','VEF','VEB','HRK','ESP','FRF','DEM','ITL','GRD','IEP','PTE','NLG',
  'BEF','ATS','FIM','LUF','SLL','ZMK','ZWD','ZWN','ZWR','AON','AOR','ARP','AFA'
,
  // Funds, index/accounting units, precious metals and test/no-currency codes.
  'BOV','CHE','CHW','CLF','COU','MXV','USN','USS','UYI','UYW',
  'XAG','XAU','XBA','XBB','XBC','XBD','XPD','XPT','XSU','XTS','XUA','XXX'
]);

const intlAny = Intl as any;

if (
  typeof intlAny.supportedValuesOf === 'function' &&
  !(intlAny.supportedValuesOf as any).__booklyCurrencyFilter
) {
  const original = intlAny.supportedValuesOf.bind(Intl);

  const filteredSupportedValuesOf = (key: string) => {
    const values = original(key);

    if (key !== 'currency' || !Array.isArray(values)) {
      return values;
    }

    return values.filter(
      (code: string) => !blockedCurrencyCodes.has(code)
    );
  };

  (filteredSupportedValuesOf as any).__booklyCurrencyFilter = true;
  intlAny.supportedValuesOf = filteredSupportedValuesOf;
}
