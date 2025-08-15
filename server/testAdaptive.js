/**
 * Adaptive system integration test
 * Steps:
 * 1. Register random user
 * 2. Fetch initial /me?debug=1
 * 3. Send low quality messages -> capture metrics
 * 4. Send high quality messages -> capture metrics
 * 5. Send decline messages -> capture metrics
 * 6. Output deltas
 */

const BASE = process.env.BASE || 'http://localhost:5000';

async function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function jsonFetch(url, opts={}) {
  const res = await fetch(url, { ...opts, headers: { 'Content-Type':'application/json', ...(opts.headers||{}) }});
  let data; try { data = await res.json(); } catch { data = { raw: await res.text() }; }
  if(!res.ok) throw new Error(`HTTP ${res.status} ${url} -> ${JSON.stringify(data)}`);
  return data;
}

function printPhase(title, snapshot) {
  console.log('\n=== '+title+' ===');
  const dbg = snapshot.user.debugAdaptive || {}; 
  console.log('level:', snapshot.user.level, 'dynamicLevel:', snapshot.user.dynamicLevel);
  console.log('buffer:', snapshot.user.levelBuffer, 'samples:', dbg.bufferStats?.samples, 'promotions:', dbg.bufferStats?.promotions, 'demotions:', dbg.bufferStats?.demotions);
  if (dbg.emaSkills) {
    console.log('EMA grammar/vocab/fluency:', dbg.emaSkills.grammar?.toFixed(2), dbg.emaSkills.vocab?.toFixed(2), dbg.emaSkills.fluency?.toFixed(2));
    console.log('lastComposite:', dbg.lastComposite);
  }
  if (dbg.metricsWindow) {
    const comps = dbg.metricsWindow.map(m=>m.composite?.toFixed(2));
    console.log('metricsWindow composites:', comps.join(','));
  }
}

async function main() {
  console.log('Registering user...');
  const email = `tester${Math.floor(Math.random()*100000)}@example.com`;
  const reg = await jsonFetch(`${BASE}/api/auth/register`, { method:'POST', body: JSON.stringify({ email, name: 'Test User', password: 'secret12' }) });
  const token = reg.token; if(!token) throw new Error('No token');
  const authHeader = { Authorization: `Bearer ${token}` };

  const getMe = () => jsonFetch(`${BASE}/api/users/me?debug=1`, { headers: authHeader });
  const chatMsg = (message) => jsonFetch(`${BASE}/api/chat`, { method:'POST', headers: authHeader, body: JSON.stringify({ message }) });

  const init = await getMe();
  printPhase('INITIAL', init);

  const badMessages = [
    'me like pizza very much',
    'she dont know',
    'i go school yesterday',
    'i are tired',
    'me want juice'
  ];
  for (const m of badMessages) { await chatMsg(m); await sleep(120); }
  const afterBad = await getMe();
  printPhase('AFTER BAD', afterBad);

  const goodMessages = [
    'I have been learning English because I really want to improve my career opportunities.',
    'Yesterday I went to the market and bought some fresh vegetables; it was surprisingly efficient.',
    'If I had more time, I would focus on improving my pronunciation strategy.',
    'She does not know the crucial perspective we discussed earlier about sustainable solutions.',
    'I enjoyed the film because it presented a fascinating concept with significant emotional impact.',
    'I have already finished the task, so I would like to start a new challenging project.'
  ];
  for (const m of goodMessages) { await chatMsg(m); await sleep(120); }
  const afterGood = await getMe();
  printPhase('AFTER GOOD', afterGood);

  const decline = [
    'good good good good good good good',
    'me want go yesterday',
    'she dont know',
    'more better idea',
    'i is happy',
    'people peoples peoples'
  ];
  for (const m of decline) { await chatMsg(m); await sleep(120); }
  const afterDecline = await getMe();
  printPhase('AFTER DECLINE', afterDecline);

  // Summary deltas
  const deltaBad = afterBad.user.levelBuffer - init.user.levelBuffer;
  const deltaGood = afterGood.user.levelBuffer - afterBad.user.levelBuffer;
  const deltaDecline = afterDecline.user.levelBuffer - afterGood.user.levelBuffer;
  console.log('\n=== DELTAS ===');
  console.log('Buffer delta (bad phase):', deltaBad);
  console.log('Buffer delta (good phase):', deltaGood);
  console.log('Buffer delta (decline phase):', deltaDecline);

  // Simple expectations (not failing build, just info)
  console.log('\nExpectations:');
  console.log('- Bad phase delta should be <= 0 (or small if early stabilization).');
  console.log('- Good phase delta should be > 0.');
  console.log('- Decline phase delta should be < good phase delta, possibly negative.');
}

main().catch(e=>{ console.error('TEST FAILED', e); process.exit(1); });
