
var videoDialogPlayer;
var fragmentPlaybackTillPauseMs = 0;
var fragmentDurationMs = 0;
var fragmentPlaybackInterval = null;;

function startFragmentPlaybackInterval() {

    if (fragmentPlaybackTillPauseMs == 0) return null;

    var intervalMs = 50;
    var interval = setInterval(function () {
        fragmentPlaybackTillPauseMs -= intervalMs;

        var readyPercent = 100 * (1 - fragmentPlaybackTillPauseMs / fragmentDurationMs);

        $("#playback-progress").css("width", readyPercent + "%");

        if (fragmentPlaybackTillPauseMs == 0) {
            clearInterval(interval);
            fragmentPlaybackInterval = null;
        }
    }, intervalMs);

    return interval;
}

function onPauseOrBuffering() {
    if (fragmentPlaybackInterval != null) {
        window.clearInterval(fragmentPlaybackInterval);
        fragmentPlaybackInterval = null;
    }
}

function getTimeFromYtLink(ytLink) {
    var startIndex = ytLink.indexOf("?t=");
    if (startIndex < 0)
        return 0;
    startIndex += 3;
    return parseInt(ytLink.substring(startIndex));
}

function onYouTubeIframeAPIReady() {


    var playerMargin = 2;
    var vpWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    var vpHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    var dialogWidth = vpWidth > 640 + playerMargin * 2 + 2
        ? 640 + playerMargin * 2 + 2
        : vpWidth;
    var dialogHeight = 40 + 390 * (dialogWidth - playerMargin * 2 - 2) / 640;
    if (vpHeight < dialogHeight) // mobile lanscape case
    {
        dialogWidth = 2 + playerMargin * 2 + 640 * (vpHeight - 60) / 390;
    }

    $("#videoDialog").width(dialogWidth + "px");
    if (vpHeight < 450) {
        $("#videoDialog").css('margin-top', '0px');
    }

    var playerWidth = dialogWidth - playerMargin * 2 - 2;
    var playerHeight = 390 * playerWidth / 640;

    console.log(dialogWidth);
    console.log(playerWidth);

    videoDialogPlayer = new YT.Player('videoDialogPlayer', {
        height: playerHeight,
        width: playerWidth,
        events: {
            'onStateChange': function (event) {
                switch (event.data) {
                    case -1: // unstarted
                        break;
                    case 0: // ended                                
                        break;
                    case 1: // playing
                        console.log("playing: " + fragmentPlaybackTillPauseMs);
                        fragmentPlaybackInterval = startFragmentPlaybackInterval();
                        break;
                    case 2: // paused
                        console.log("paused: " + fragmentPlaybackTillPauseMs);
                        onPauseOrBuffering();
                        break;
                    case 3: // buffering
                        console.log("buffering: " + fragmentPlaybackTillPauseMs);
                        onPauseOrBuffering();
                        break;
                    case 5:
                        console.log('video cued');
                        break;
                }
            }
        }
    });
}

var currentId = "X";
var currentStart = 0;
var currentEnd = 0;
function updatePlayer(id, start, end, question) {
    currentId = id;
    currentStart = start;
    currentEnd = end;
    fragmentDurationMs = (end - start) * 1000;
    fragmentPlaybackTillPauseMs = fragmentDurationMs;
    fragmentPlayingAt = -1;
    $(".modal-title").text(question);
    $('#playback-progress').css("width", "0%");
}

$(function () {
    $('.video-dialog')
        .on('shown.bs.modal', function () {
            videoDialogPlayer.loadVideoById({
                'videoId': currentId,
                'startSeconds': currentStart
                // 'endSeconds': currentEnd
            });
        }).on('hide.bs.modal', function () {
            videoDialogPlayer.stopVideo();
        });
});

function fancyTimeFormat(time) {
    // Hours, minutes and seconds
    var hrs = ~~(time / 3600);
    var mins = ~~((time % 3600) / 60);
    var secs = time % 60;

    // Output like "1:01" or "4:03:59" or "123:03:59"
    var ret = "";

    if (hrs > 0) {
        ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
    }

    ret += "" + mins + ":" + (secs < 10 ? "0" : "");
    ret += "" + secs;
    return ret;
}

function getQuestionCellHtml(question, tags, duration) {
    return '<div class="question-text" style="font-size: 1em;">' + question
        + ' (' + fancyTimeFormat(duration)
        + ')' + '</div>' + '<p class="tags" style="font-size: 0.75em;">' + tags + '</p>';
}

function getCommandCellHtml(id, start, end, question) {
    var html = '<a onclick="updatePlayer(' + "'" + id + "'," + start + ',' + end
        + ",'" + question + "')" + '" '
        + 'class="fragment-link youtube" href="#" data-toggle="modal" data-target=".video-dialog"><img src="yt.png" /></a>';

    return html;
}

$(document).ready(function () {

    $('#example thead th').each(function () {
        var title = $(this).text();
        if (title == "Вопрос" || title == "Дата" || title == "Видео") {
            var html = '<input style="width: 95%; font-size: 1em; min-width: 100px;" type="text" placeholder="' + title + '" />';
            $(this).html(html);
        }
    });

    var gridData = [];

    fragmentData.forEach(function (row) {
        var duration = row.end - row.start;
        gridData.push({
            date: new Date(row.videoTimestamp),
            videotitle: row.videoTitle,
            question: getQuestionCellHtml(row.description, row.tags, duration),
            link: getCommandCellHtml(row.videoId, row.start, row.end, row.description),
        });
    });

    var table = $('#example').DataTable({
        paging: false,
        fixedHeader: true,
        pageLength: 50,
        scrollY: '80vh',
        sDom: 'Rfrtlip',
        data: gridData,
        columns: [
            { "data": "link" },
            { "data": "question" },
            { "data": "videotitle" },
            { "data": "date", "type": "date" }
        ]
    });

    // Apply the search
    table.columns().every(function () {
        var that = this;
        var input = $('input', this.header());
        var timeout = null;
        var searchFunction = function () {
            if (that.search() !== input.value) {
                that.search(input.val()).draw();
            }
            timeout = null;
        };
        input.on('keyup change', function () {
            if (timeout != null) {
                window.clearTimeout(timeout);
            }
            timeout = window.setTimeout(searchFunction, 1000);
        });
    });
});

