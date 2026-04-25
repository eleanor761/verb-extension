// Use SONA participant ID if passed in URL (?id=XXXX), otherwise generate a random one
const urlParams = new URLSearchParams(window.location.search);
const sonaId = urlParams.get('id');
let participant_id = sonaId ? `sona_${sonaId}` : `participant${Math.floor(Math.random() * 999) + 1}`;

// Pre-instantiate audio to avoid playback delay on first use
const bleepSound = new Audio('../stimuli/bleep.wav');
const buzzSound = new Audio('../stimuli/buzz.wav');
bleepSound.load();
buzzSound.load();
const completion_code = generateRandomString(3) + 'zvz' + generateRandomString(3);
const sona_id = new URLSearchParams(window.location.search).get('sona_id') || '';

function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

const jsPsych = new jsPsychModule.JsPsych({
  show_progress_bar: false
});

jsPsych.data.addProperties({ sona_id: sona_id });

let timeline = [];

const consent = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
        <div style="width: 800px; margin: 0 auto; text-align: left">
            <h3>Consent to Participate in Research</h3>

            <p>The task you are about to do is sponsored by University of Wisconsin-Madison. It is part of a protocol titled "What are we learning from language?"</p>

            <p>The task you are asked to do involves making simple responses to words and sentences. For example, you may be asked to rate a pair of words on their similarity or to indicate how true you think a given sentence is. More detailed instructions for this specific task will be provided on the next screen.</p>

            <p>This task has no direct benefits. We do not anticipate any psychosocial risks. There is a risk of a confidentiality breach. Participants may become fatigued or frustrated due to the length of the study.</p>

            <p>The responses you submit as part of this task will be stored on a sercure server and accessible only to researchers who have been approved by UW-Madison. Processed data with all identifiers removed could be used for future research studies or distributed to another investigator for future research studies without additional informed consent from the subject or the legally authorized representative.</p>

            <p>You are free to decline to participate, to end participation at any time for any reason, or to refuse to answer any individual question without penalty or loss of earned compensation. We will not retain data from partial responses. If you would like to withdraw your data after participating, you may send an email lupyan@wisc.edu or complete this form which will allow you to make a request anonymously.</p>

            <p>If you have any questions or concerns about this task please contact the principal investigator: Prof. Gary Lupyan at lupyan@wisc.edu.</p>

            <p>If you are not satisfied with response of the research team, have more questions, or want to talk with someone about your rights as a research participant, you should contact University of Wisconsin's Education Research and Social & Behavioral Science IRB Office at 608-263-2320.</p>

            <p><strong>By clicking the box below, I consent to participate in this task and affirm that I am at least 18 years old.</strong></p>
        </div>
    `,
    choices: ['I Agree', 'I Do Not Agree'],
    data: { trial_type: 'consent' },
    on_finish: function(data) {
        if (data.response == 1) {
            jsPsych.endExperiment('Thank you for your time. The experiment has been ended.');
        }
    }
};

const training_instructions = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
        <p>In this task, you will be learning words for a collection of actions.</p>
        <p>On each trial, a short video will play. Click the word that best matches the action in the video.</p>
        <p>You will receive sound feedback after each response, so please make sure your volume is turned up.</p>
        <p>A correct response will be followed by a beep; an incorrect response will be followed by a buzz.</p>
        <p>Please do your best to be as accurate as possible.</p>
        <p>Press any key to begin. Please be patient — the experiment may take a few moments to load.</p>
    `,
};

const experiment_instructions = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
        <p>In this task, you will be asked to write the single word that best describes what is happening in the video.</p>
        <p>Try to be as precise as possible, but there are no right or wrong answers.</p>
        <p>Press any key to begin.</p>
    `,
};

function getVideoPath(stimName) {
    const folder = stimName.replace(/[0-9_].*$/, '');
    return `../stimuli/${folder}/${stimName}`;
}

function createTrainingTrials(trainingData) {
    return trainingData.map(trial => {
        const choices = jsPsych.randomization.shuffle([trial.word, trial.opponent]);
        return {
            type: jsPsychVideoButtonResponse,
            stimulus: [getVideoPath(trial.filename)],
            choices: choices,
            width: 640,
            height: 480,
            autoplay: true,
            loop: true,
            post_trial_gap: 500,
            correct_choice: trial.word,
            feedback_duration: 600,
            prompt: 'Which word matches the action in the video?',
            data: {
                subCode: participant_id,
                trial_num: trial.trial_num,
                word: trial.word,
                dimension: trial.dimension,
                filename: trial.filename,
                opponent: trial.opponent,
                stage: 'training',
                trial_type: 'training',
                choices: choices
            },
            on_finish: function(data) {
                data.rt = Math.round(data.rt);
                data.selected = data.choices[data.response];
                data.correct = (data.selected === data.word) ? 1 : 0;

                if (data.correct === 1) {
                    bleepSound.currentTime = 0;
                    bleepSound.play();
                } else {
                    buzzSound.currentTime = 0;
                    buzzSound.play();
                }
            }
        };
    });
}

function createExperimentTrials(experimentData) {
    return experimentData.map(trial => ({
        type: jsPsychSurveyText,
        preamble: `
            <video width="640" height="480" autoplay loop>
                <source src="${getVideoPath(trial.filename)}" type="video/mp4">
            </video>
        `,
        questions: [
            {
                prompt: 'What single word best describes what is happening in the video?',
                rows: 1,
                columns: 40,
                required: true,
                name: 'word_response'
            }
        ],
        button_label: 'Submit',
        data: {
            subCode: participant_id,
            trial_num: trial.trial_num,
            word: trial.word,
            dimension: trial.dimension,
            filename: trial.filename,
            opponent: trial.opponent,
            stage: 'experiment'
        },
        on_load: function() {
            const submitBtn = document.querySelector('#jspsych-survey-text-next');
            const video = document.querySelector('video');
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.5';

            let playedOnce = false;
            video.addEventListener('timeupdate', function() {
                if (!playedOnce && video.currentTime > 0 && video.duration > 0 &&
                    video.duration - video.currentTime < 0.5) {
                    playedOnce = true;
                    submitBtn.disabled = false;
                    submitBtn.style.opacity = '1';
                }
            });
        },
        on_finish: function(data) {
            data.rt = Math.round(data.rt);
            data.word_response = data.response.word_response;
        }
    }));
}

const preload = {
    type: jsPsychPreload,
    auto_preload: false,
    audio: ['../stimuli/bleep.wav', '../stimuli/buzz.wav']
};

function getFilteredData() {
    const trials = jsPsych.data.get().values()
        .filter(trial => trial.stage === 'training' || trial.stage === 'experiment');

    if (trials.length === 0) {
        console.error("No trials found!");
        return '';
    }

    try {
        const columns = ['subCode', 'sona_id', 'stage', 'trial_num', 'word', 'dimension', 'filename', 'opponent', 'rt', 'selected', 'correct', 'word_response'];

        const header = columns.join(',');

        const rows = trials.map(trial => {
            return columns.map(column => {
                const value = trial[column];
                if (value === null || value === undefined) {
                    return '';
                } else if (typeof value === 'string') {
                    return `"${value.replace(/"/g, '""')}"`;
                } else {
                    return value;
                }
            }).join(',');
        });

        return header + '\n' + rows.join('\n');
    } catch (error) {
        console.error("Error in getFilteredData:", error);
        return `subCode,error\n"error","${error.message}"`;
    }
}

const save_data = {
    type: jsPsychPipe,
    action: "save",
    experiment_id: "2s64XTHvwoMZ",
    filename: `${participant_id}.csv`,
    data_string: getFilteredData,
    success_callback: function() {
        console.log('Data saved. Participant:', participant_id);
        jsPsych.data.addProperties({ completed: true });
    },
    error_callback: function(error) {
        console.error('Error saving to DataPipe:', error);
        jsPsych.endExperiment(`<p>There was an error saving your data. Please contact the researcher with this information: ${error}</p><p>Error code: ${error.status || 'unknown'}</p>`);
    }
};

const completion_code_trial = {
    type: jsPsychHtmlButtonResponse,
    stimulus: function() {
        return `
            <p>You have completed the main experiment!</p>
            <p>You can close the page now.</p>
        `;
    },
    choices: ['Finish'],
    data: { trial_type: 'completion' },
    on_finish: function() {
        window.location.href = `https://uwmadison.sona-systems.com/default.aspx?logout=Y`;
    }
};

async function runExperiment() {
    try {
        console.log('Starting experiment. Participant:', participant_id);

        // Inject button spacing styles
        const style = document.createElement('style');
        style.textContent = `
            .jspsych-video-button-response-button {
                display: inline-block;
                margin: 12px 20px;
            }
            .jspsych-video-button-response-button button {
                padding: 10px 32px;
                font-size: 1.1em;
            }
        `;
        document.head.appendChild(style);

        const { training, experiment } = await loadTrials();
        console.log('Training trials:', training.length, '| Experiment trials:', experiment.length);

        const trainingTrials = createTrainingTrials(training).slice(0,1);
        const experimentTrials = createExperimentTrials(experiment);

        timeline = [
            //consent,
            //training_instructions,
            preload,
            ...trainingTrials,
            experiment_instructions,
            //...experimentTrials,
            save_data,
            completion_code_trial
        ];

        jsPsych.run(timeline);
    } catch (error) {
        console.error('Error running experiment:', error);
        document.getElementById('jspsych-target').innerHTML = `
            <div style="max-width: 800px; margin: 50px auto; padding: 20px; background: #f8f8f8; border-radius: 5px;">
                <h2>Error Starting Experiment</h2>
                <p>There was a problem starting the experiment. Please try refreshing the page.</p>
                <p>If the problem persists, please contact the researcher.</p>
                <p>Technical details: ${error.message}</p>
                <pre style="background: #f1f1f1; padding: 10px; overflow: auto;">${error.stack}</pre>
            </div>
        `;
    }
}

async function loadTrials() {
    try {
        const response = await fetch('v3-trials.csv');
        const csvText = await response.text();

        const results = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true
        });

        const allData = results.data;

        const trainingByWord = {};
        allData.filter(t => t.stage === 'training').forEach(t => {
            if (!trainingByWord[t.word]) trainingByWord[t.word] = [];
            trainingByWord[t.word].push(t);
        });

        const training = jsPsych.randomization.shuffle(
            Object.values(trainingByWord).flatMap(trials =>
                jsPsych.randomization.shuffle(trials).slice(0, 3)
            )
        ).map((t, i) => ({ ...t, trial_num: i }));

        const experiment = jsPsych.randomization.shuffle(
            allData.filter(t => t.stage === 'experiment')
        ).map((t, i) => ({ ...t, trial_num: i }));

        return { training, experiment };
    } catch (error) {
        console.error('Error loading trials:', error);
        return { training: [], experiment: [] };
    }
}

document.addEventListener('DOMContentLoaded', runExperiment);
