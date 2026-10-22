import test from 'node:test';
import assert from 'node:assert';
import { CONSTRAINT_DETAILS } from './constraintDetails.ts';

test('Constraint Details: All 7 operational constraints defined', () => {
  const expectedKeys = ['stall', 'takeoff', 'speed', 'climb', 'ceiling', 'turn', 'cruise'];
  
  for (const key of expectedKeys) {
    const detail = CONSTRAINT_DETAILS[key];
    assert.ok(detail, `Missing constraint detail for key: ${key}`);
    assert.strictEqual(detail.id, key);
    assert.ok(detail.title.length > 3);
    assert.ok(detail.shortRule.length > 10);
    assert.ok(detail.infeasibleSide.length > 5);
    assert.ok(detail.violationConsequence.length > 10);
    assert.ok(detail.aerodynamicMechanics.length >= 3);
    assert.ok(detail.operationalContext.length > 20);
    assert.ok(detail.variables.length >= 3);

    for (const v of detail.variables) {
      assert.ok(v.symbol.length > 0);
      assert.ok(v.name.length > 0);
      assert.ok(v.units.length > 0);
      assert.ok(v.description.length > 5);
    }
  }
});
