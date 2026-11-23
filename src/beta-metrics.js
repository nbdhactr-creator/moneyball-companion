import {formatMetric,referenceExplanation} from "./beta-benchmarks.js";
export function benchmarkPanel(summary,items,{E},title="What good looks like"){
 if(!summary)return '<section class="card reference"><h2>'+E(title)+'</h2><p>Choose an FM24 role to see its three key statistics.</p></section>';
 const lookedUp=new Map((items??[]).map(x=>[x.metric,x]));
 const cards=summary.metrics.map(m=>{
  const v=lookedUp.get(m.metric);
  const ready=m.n>=10;
  const value=v?'<p class="benchmark-value">'+E(formatMetric(v.value,m.metric))+'</p>':'';
  const quantile=ready?'<span class="benchmark-bands">Peer median: <strong>'+E(formatMetric(m.median,m.metric))+'</strong> · Top-fifth threshold: <strong>'+E(formatMetric(m.strong,m.metric))+'</strong></span>':'<span>Insufficient peers for a reliable benchmark</span>';
  const assessed=v?(v.percentile!=null?'<p class="benchmark-peer">'+E(Math.round(v.percentile))+'th peer percentile · '+E(v.interpretation)+'</p>':'<p class="benchmark-peer">'+E(v.reason||"Not comparable")+'</p>'):'';
  return '<article class="benchmark-stat"><div class="head"><h3>'+E(m.label)+'</h3><small>'+E(m.n)+' peers</small></div>'+value+assessed+quantile+'<small>'+E(m.derived?"Calculated from export":"Imported or directly reported stat")+'</small></article>';
 }).join("");
 return '<section class="reference card" aria-label="'+E(title)+'"><div class="head"><div><p class="eyebrow">FM24 / evidence</p><h2>'+E(title)+'</h2></div><span class="reference-chip">'+E(summary.positionGroup)+'</span></div>'+
 '<p>'+E(referenceExplanation(summary))+' · Evidence model '+E(summary.modelVersion||"FM24")+'.</p><div class="benchmark-grid">'+cards+'</div><details class="method-notes"><summary>How to read these comparisons</summary><p>Percentiles show where the measured value sits among eligible positional peers, not how likely a signing is to succeed. The top-fifth threshold is the 80th percentile for higher-is-better measures and the 20th percentile for lower-is-better measures. Metric attempt floors are applied. When fewer than 10 peers qualify, we withhold comparisons. For players with limited minutes, interpret all results cautiously.</p><p>Comparison scope does not alter Role Fit or Philosophy Fit: those retain their separate full-dataset calculations.</p></details></section>';
}
export function metricCompact(items,{E}){
 if(!items?.length)return '<small>No role essentials available.</small>';
 return '<div class="comparison-essentials">'+items.map(x=>'<div><small>'+E(x.label)+'</small><strong>'+E(formatMetric(x.value,x.metric))+'</strong><small>'+(x.percentile===null?E(x.reason||"Not comparable"):E(Math.round(x.percentile))+"th percentile")+'</small></div>').join("")+'</div>';
}
