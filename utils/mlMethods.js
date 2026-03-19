import * as tf from '@tensorflow/tfjs';
import { AI_AGENTS_LEARNINIG_CONSTS, qTable } from '../common/gameConstants.js';

export async function GetAgentAction(state, actions) 
{
    if (Math.random() < AI_AGENTS_LEARNINIG_CONSTS.epsilon) 
    {
        // Exploration: choose random action
        return actions[Math.floor(Math.random() * actions.length)];
    } 
    else 
    {
        // Exploitation: choose action with highest Q-value
        const qValues = await qTable.gather(tf.tensor1d(state));
        qValues.maskedScatter(tf.tensor1d(actions), tf.tensor1d(-Infinity));
        return tf.argMax(qValues).dataSync()[0];
    }
}
export async function UpdateQTable(state, action, reward, nextState) 
{
    const qValues = await qTable.gather(tf.tensor1d(state));
    const nextQValues = await qTable.gather(tf.tensor1d(nextState));
    const maxNextQValue = tf.max(nextQValues);
    const targetQValue = reward + AI_AGENTS_LEARNINIG_CONSTS.discountFactor * maxNextQValue;

    const tdError = targetQValue.sub(qValues.gather(tf.tensor1d(action)));
    const update = tdError.mul(AI_AGENTS_LEARNINIG_CONSTS.learningRate);
    const newQValue = qValues.gather(tf.tensor1d(action)).add(update);

    qTable = qTable.scatter(tf.tensor1d(state), newQValue.expandDims());
}
