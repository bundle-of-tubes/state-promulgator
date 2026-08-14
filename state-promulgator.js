'use strict';

class StatePromulgator {
  #state;
  #intermediateFunctions;
  #callbacks;
  
  constructor(initialState) {
    this.#state = initialState;
    this.#intermediateFunctions = new Map();
    this.#callbacks = new Map(); 
  }

  defineIntermediate(callback, stateDependencies, intermediateDependencies) {
    const key = Symbol();
    this.#intermediateFunctions.set(key, {
      callback,
      stateDependencies,
      intermediateDependencies
    });
    return key;
  }

// This would need to check that the dependency is unused and probably doesn't have any use-cases
//  removeIntermediate(key) {
//    this.#intermediateFunctions.delete(key);
//  }

  registerCallback(callback, stateDependencies, intermediateDependencies) {
    const key = Symbol();
    this.#callbacks.set(key, {
      callback,
      stateDependencies,
      intermediateDependencies
    });
    return key;
  }

// Probably doesn't have any use-cases...
//  removeCallback(key) {
//    this.#callbacks.delete(key);
//  }

  getState() {
    return this.#state;
  }

  #computeIntermediates(keySet, oldState, newState) {
    // determine the which intermediate values need to be computed
    for (const key of keySet) {
      const {intermediateDependencies} = this.#intermediateFunctions.get(key);
      for (const d of intermediateDependencies) {
        keySet.add(d); // take advantage of insertion-order iteratation to ensure that d becomes a key later in the loop
      }
    }
    // determine the order in which intermediate values need to be computed, taking advantage of Map's insertion-order iteration--earlier entries can't depend on later entries
    const orderedDependencyKeys = Array.from(this.#intermediateFunctions.keys()).filter(d=>keySet.has(d));
    // calculate intermediate values
    const intermediateValues = new Map();
    for (for key of orderedDependencyKeys) {
      const {callback} = this.#intermediateFunctions.get(key);
      intermediateValues.set(key, callback(newState, oldState, intermediateValues));
    }
    return intermediateValues;
  }

  #executeSelection(stateMembers, oldState, newState) {
    let intermediateKeys = new Set();
    const subscribedCallbackKeys = new Set();
    for (const [key, {stateDependencies, intermediateDependencies}] of this.#callbacks.entries()) {
      if (!stateDependencies.isDisjointFrom(stateMembers)) {
        subscribedCallbackKeys.add(key);
        intermediateKeys = intermediateKeys.union(intermediateDependencies);
      }
    }
    const intermediateValues = this.#computeIntermediates(intermediateKeys, oldState, newState);
    for (const key of subscribedCallbackKeys) {
      const {callback} = this.#callbacks.get(key);
      callback(newState, oldState, intermediateValues);
    }
  }

  updateState(newState, mutatedAttributes) {
    const updates = new Set(Object.entries(newState).filter(([attr, newVal])=>{
      if (Object.hasOwn(this.#state, attr)) {
        return mutatedAttributes || newVal !== this.#state[attr];
      }
      else {
        return true;
      }
    }).map(([attr,])=>attr));
    this.#executeSelection(updates, this.#state, newState);
    Object.assign(this.#state, newState);
  }

}
