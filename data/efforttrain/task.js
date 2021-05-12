var font_colour = "white";
var background_colour = "black";
set_colour(font_colour, background_colour);

var debug = true;

trial_repetitions = 5;
rocket_selection_deadline = null; // ms

// dot motion task parameters
dot_motion_repetitions = 3;
dot_motion_deadline = 10000;
p_incongruent_dots = 0.65;
num_majority = 300;

// colours used for task, with left and right randomized for each experiment
colours = ['#D00000', '#FF9505', '#6DA34D', '#3772FF'];
var colours = jsPsych.randomization.repeat(colours, 1);
colours_left = colours.slice(2, 4)
colours_right = colours.slice(0, 2)

var subject_id = 1;
var assigned_info = assign.filter(i => i.subject == subject_id)[0];


var images = {
    bg: 'instruct_background.png',
    no_reward_feedback: 'alien_noreward_feedback.png',
    no_reward: 'alien_noreward.png',
    reward_feedback: 'alien_reward_feedback.png',
    reward: 'alien_reward.png',
    rocket1: assigned_info.rocket1,
    rocket2: assigned_info.rocket2,
    pattern1: assigned_info.pattern1,
    pattern2: assigned_info.pattern2
};

for (const [key, value] of Object.entries(images)) {
    images[key] = "stimuli/" + value;
}

var instructions = {
    type: "instructions",
    pages: [
        generate_html("Welcome!", font_colour) + generate_html("Click next or press the right arrow key to proceed.", font_colour),
    ],
    on_start: function () {
        document.body.style.backgroundImage = "url('stimuli/instruct_background.png')";
        document.body.style.backgroundSize = "cover";
    },
    on_finish: function () {
        document.body.style.backgroundImage = '';
    },
    show_clickable_nav: true,
    show_page_number: true,
};

var colour_blocks = {
    type: "html-keyboard-response",
    stimulus: `
    <div style='width: 100px; float:left; padding-right: 10px;'>
    <div style='color: ${colours_left[0]}; font-size:610%; margin-bottom: 20px; width: 100px; height: 100px; position: relative;'>&lArr;</div>
    <div style='color: ${colours_left[1]}; font-size:610%; width: 100px; height: 100px; position: relative'>&lArr;</div>
    </div>
    <div style='width: 100px; float:right; padding-left: 10px;'>
    <div style='color: ${colours_right[0]}; font-size:610%; margin-bottom: 20px; width: 100px; height: 100px; position: relative;'>&rArr;</div>
    <div style='color: ${colours_right[1]}; font-size:610%; width: 100px; height: 100px; position: relative'>&rArr;</div>
    </div>
  `
}


var rocket_choices = [];
var rockets = {
    type: "html-keyboard-response",
    stimulus: `
      <div>
      <div style='float: left; padding-right: 10px'><img src='${images.rocket1}' width='100'></img></div>
      <div style='float: right; padding-left: 10px'><img src='${images.rocket2}' width='100'></img></div>
      </div>
    `,
    choices: [37, 39],
    trial_duration: rocket_selection_deadline,
    on_finish: function (data) {
        if (data.key_press == 37) {
            data.rocket = assigned_info.rocket1
        } else {
            data.rocket = assigned_info.rocket2
        }
        rocket_choices.push(data.rocket);
    }
};

var left_rocket_remaining =
    `<div>
    <div style='float: left; padding-right: 10px'><img src='${images.rocket1}' width='100'></img></div>
    <div style='float: right; padding-left: 10px'><img width='100'></img></div>
    </div>`;

var right_rocket_remaining =
    `<div>
    <div style='float: left; padding-right: 10px'><img width='100'></img></div>
    <div style='float: right; padding-left: 10px'><img src='${images.rocket2}' width='100'></img></div>
    </div>`;

var rocket_chosen = {
    type: 'html-keyboard-response',
    stimulus: '',
    on_start: function (trial) {
        var key_press = jsPsych.data.get().last(1).values()[0].key_press;
        if (key_press == 37) {
            trial.stimulus = left_rocket_remaining;
        } else if (key_press == 39) {
            trial.stimulus = right_rocket_remaining;
        } else {
            trial.stimulus = 'Too slow'
        }
    },
    choices: jsPsych.NO_KEYS,
    trial_duration: 500,
}

var dot_motion_rt = [];
var dot_motion_parameters = dot_motion_trial_variable(true);
var dot_motion = {
    on_start: function() {
        dot_motion_parameters = dot_motion_trial_variable(true);
    },
    type: "rdk",
    background_color: background_colour,
    choices: [37, 39],
    trial_duration: dot_motion_deadline,
    coherence: function () { return [dot_motion_parameters.majority_coherence, dot_motion_parameters.distractor_coherence] },
    coherent_direction: function () { return dot_motion_parameters.coherent_direction },
    dot_color: function () { return [dot_motion_parameters.majority_col, dot_motion_parameters.distractor_col] },
    correct_choice: function () { return [dot_motion_parameters.correct_choice] },
    move_distance: 6,
    number_of_apertures: 2,
    number_of_dots: function () { return [dot_motion_parameters.num_majority, dot_motion_parameters.num_distractors] },
    RDK_type: 2,
    aperture_width: 500,
    aperture_center_x: [(window.innerWidth / 2), (window.innerWidth / 2)],
    aperture_center_y: [(window.innerHeight / 2), (window.innerHeight / 2)],
    on_finish: function (data) {
        if (data.correct) {
            dot_motion_rt.push(data.rt);
            if (debug) {
                console.log(dot_motion_rt);
                console.log('Your answer is correct');
            }
        } else {
            if (debug) {
                console.log('Your answer is incorrect')
            }
        }

        data.congruent = dot_motion_parameters.congruent;
    }
}

// 1 dot motion trial
function dot_motion_trial_variable(is_hard) {
    // select two random colours and assign them to answer and distractor
    var selected_colours = jsPsych.randomization.sampleWithoutReplacement(colours, 2)
    var majority_col = selected_colours[0];
    var distractor_col = selected_colours[1];

    // store answers and their respective dot motion properties into object
    var trial_variable = {
        majority_col: majority_col,
        distractor_col: distractor_col,
        num_majority: num_majority,
        num_distractors: Math.floor(Math.random() * (50 - 20 + 1)) + 20,
        majority_coherence: Math.random() * (1 - 0.75) + 0.75,
        distractor_coherence: Math.random() * (1 - 0.75) + 0.75,
    };

    // evaluate motion direction
    if (p_incongruent_dots < Math.random()) { // if incongruent
        if (colours_left.includes(majority_col)) {  // if answer is a left colour
            trial_variable.coherent_direction = [0, 180];  // majority dots move right
        } else {  // if answer is a right colour
            trial_variable.coherent_direction = [180, 0];  // majority dots move left
        }
        trial_variable.congruent = false;
    } else {  // if congruent
        if (colours_left.includes(majority_col)) {  // if answer is a left colour
            trial_variable.coherent_direction = [180, 0];  // majority dots move left
        } else {  // if answer is a right colour
            trial_variable.coherent_direction = [0, 180];  // majority dots move right
        }
        trial_variable.congruent = true;
    }
    
    // evaluate correct choice
    if (is_hard) {  // if task is hard
        if (colours_left.includes(majority_col)) {
            trial_variable.correct_choice = 37;  // correct answer is left arrow
        } else {
            trial_variable.correct_choice = 39; // correct answer is right arrow
        }
    } else {  // if task is easy
        if (trial_variable.coherent_direction[0] == 0) {  // if majority's coherent direction is right
            trial_variable.correct_choice = 39;  // correct answer is right arrow
        } else {
            trial_variable.correct_choice = 37;
        }
    }

    if (debug) { 
        console.log(selected_colours);
        console.log(trial_variable.correct_choice);
    }
    return trial_variable;
}

var dot_motion_trials = {
    timeline: [dot_motion],
    repetitions: dot_motion_repetitions,
}

// TODO: 3 blocks: pre-training, training, post-training
// pre-training = post-training -> no feedback for correctness
// no data for post-training
// store dot motion acc, correct rt, num correct
// training -> feedback with aliens
var pre_training = {
    timeline: [rockets, rocket_chosen, dot_motion_trials],
    repetitions: trial_repetitions,
}



var timeline = []
// timeline.push(instructions);
timeline.push(colour_blocks);
timeline.push(pre_training);



jsPsych.init({
    // timeline: [instructions, rockets_procedure],
    timeline: timeline,
    preload_images: Object.values(images),
    on_finish: function () {
        jsPsych.data.displayData();
    }
});