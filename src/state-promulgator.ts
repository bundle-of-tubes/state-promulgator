'use strict';

interface StateObject {
  [attr: string]: any;
}
type IntermediateValues = Map<symbol, any>;
type UpdaterCallback = (newState: StateObject, oldState: StateObject, intermediateValues: IntermediateValues)=>any;

class StatePromulgatorError extends Error {}

/** Encapsulation of a state object with callbacks to be executed when attributes of the state are changed */
export default class StatePromulgator {
  /** The state Object with string properties */
  state: StateObject; //initilized in constructor
  #updaterRegistry: Map<symbol, {callback: UpdaterCallback, triggeringStateProperties: Set<string>, intermediateDependencies: Set<symbol>}> = new Map();

  /**
   * @param initialState the initial value of the state object
   */
  constructor(initialState: StateObject) {
    this.state = initialState;
  }

  /**
   * Declare a function to be executed when selected attributes of the state are updated or when other registered functions depend on the results of this
   * The callback function will be executed only whe the state is updated
   * @return a unique identifier for the intermediate function, which can be used as a dependency of other registered callbacks
   * @param callback The function to be executed in state transitions.
   *   The first parameter of callback is the new value of the state
   *   The second parameter of the callback is the previous value of the state
   *   The third parameter of the callback is a Map where the keys are the return values of previously declared intermediates and the values are the return values of associated callbacks
   *   The return value of callback will be accessible to other callbacks via the third parameter
   * @param triggeringStateProperties The set of attributes of the state which when changed cause this callback to run
   * @param intermediateDependencies The set of keys of other intermediates that need to be computed before this
   */
  registerCallback(callback: UpdaterCallback, triggeringStateProperties: Set<string>, intermediateDependencies: Set<symbol>): symbol {
    const key: unique symbol = Symbol();
    this.#updaterRegistry.set(key, {
      callback,
      triggeringStateProperties,
      intermediateDependencies
    });
    return key;
  }

  /**
   * Merge the new state with the existing state and execute the callbacks that are triggered by updated state attributes
   * @param newState An object whose properties represent attributes of the state to be updated
   * @param promulgateUnchangedProperties If true, callbacks will trigger for all properties of newState, even if they are identical to those of the old state
   * @throws {StatePromulgatorError} May throw an exception if callbacks are removed while this is running
   */
  updateState(newState: StateObject, promulgateUnchangedProperties: boolean = false): undefined {
    // determine which attributes trigger callbacks
    let relevantStateEntries = Object.entries(newState);
    if (!promulgateUnchangedProperties) {
      relevantStateEntries = relevantStateEntries.filter(([attr, newVal]: [string, any]) => newVal !== this.state[attr]);
    }
    const updatedAttributes: Set<string> = new Set(relevantStateEntries.map(([attr,]: [string, any]) => attr));
    // collect keys of callbacks that are triggered by members of updatedAttributes
    const relevantCallbacks: Set<symbol> = new Set();
    for (const [key, {triggeringStateProperties}] of this.#updaterRegistry.entries()) {
      if (!triggeringStateProperties.isDisjointFrom(updatedAttributes)) {
        relevantCallbacks.add(key);
      }
    }
    // Add dependencies of all relevantCallbacks to relevantCallbacks
    for (const x of relevantCallbacks) {
      const c = this.#updaterRegistry.get(x);
      if (c === undefined) {
        throw new StatePromulgatorError("A callback has disappeared!");
      }
      for (const y of c.intermediateDependencies) {
        relevantCallbacks.add(y); //insertion-order iteration guarantees that y becomes x unless it was already in relevantCallbacks
      }
    }
    // Perform updates/intermediate calculations
    const intermediateValues: Map<symbol, any> = new Map();
    for (const [key, {callback}] of this.#updaterRegistry.entries()) {
      if (relevantCallbacks.has(key)) {
        intermediateValues.set(key, callback(newState, this.state, intermediateValues));
      }
    }
    Object.assign(this.state, newState);
  }
}
