import {tradingSession} from '../src/utils/tradingSession';
export type Observation = { price:number; observedAt:number; currency:string; symbol:string };
export type Pair = { symbol:string; yahoo:Observation|null; finnhub:Observation|null; session:{start:number;end:number}|null };
export function comparePair(pair:Pair, now:number) {
  const unavailable = (reason:string) => ({status:'unavailable',reason,difference:null,tolerance:null});
  const inconclusive = (reason:string) => ({status:'inconclusive',reason,difference:null,tolerance:null});
  const {yahoo, finnhub, session} = pair;
  if (!yahoo || !finnhub) return unavailable('A provider observation is unavailable');
  if (![yahoo,finnhub].every(o => Number.isFinite(o.price) && Number.isFinite(o.observedAt) && o.observedAt > 0 && o.symbol === pair.symbol && o.currency === 'USD'))
    return unavailable('Invalid observation identity, currency, price or timestamp');
  if (!Number.isFinite(now) || !session || !Number.isFinite(session.start) || !Number.isFinite(session.end) ||
      session.end <= session.start || session.end-session.start > 7*3600000 || now < session.start || now >= session.end || tradingSession(now) !== 'regular')
    return inconclusive('A current regular US trading session is required');
  if ([yahoo,finnhub].some(o => o.observedAt < session.start || o.observedAt >= session.end || o.observedAt > now+5000 || now-o.observedAt > 120000) ||
      Math.abs(yahoo.observedAt-finnhub.observedAt) > 60000)
    return inconclusive('Provider observation times are stale or insufficiently aligned');
  // Predeclared cross-feed diagnostic tolerance, not an exchange accuracy guarantee.
  const difference = yahoo.price-finnhub.price, tolerance = Math.max(0.05,Math.abs(finnhub.price)*0.001);
  const matches = Math.abs(difference) <= tolerance + Number.EPSILON * Math.max(1,Math.abs(yahoo.price),Math.abs(finnhub.price));
  return {status:matches?'within-tolerance':'outside-tolerance',reason:'Current nominal USD prices from independent feeds',difference,tolerance};
}
