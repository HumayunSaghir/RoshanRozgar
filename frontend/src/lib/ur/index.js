// English -> Urdu phrase dictionaries. Each group lives in its own file so features can be translated independently.
import common from './common';
import landing from './landing';
import worker from './worker';
import customer from './customer';
import system from './system';
import jobs from './jobs';
import jobsWorker from './jobsWorker';
import misc from './misc';
import verify from './verify';

export const UR = { ...common, ...landing, ...worker, ...customer, ...system, ...jobs, ...jobsWorker, ...misc, ...verify };
