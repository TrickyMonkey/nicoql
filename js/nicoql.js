/*!
 * NicoNico Quick Look Engine v12.0.3
 * http://www.cafe-gentle.jp/work/nicoql/
 *
 * Copyright 2012, T-key (Trickey)
 *
 * Date: Sun Sep 16 00:00:00 2012 -0900
 */

// initialize
jQuery(function($) {
    // Clear all movie lists from rink.
    $("#remocon_clr").click(function() {
        $("#rink section").not("#bookmark").remove();
        $("#remocon_box").empty();
        save(); });
    // Make Movie Detail function off.
    $('#movie_detail').click(function() { $('#movie_detail').hide(300); });
    // Search movies related with query by using NicoNico Douga.
    $("#search_box").keydown(function(e) {
        if (e.keyCode == 13) { // if user presses RETURN key
            location.href = 'http://www.nicovideo.jp/search/' + $("#search_box").val();
        } });
    // about remocon and filter
    // Make remocon and filter functions on/off.
    $("#remocon_toggle").click(function() {
        $("#remocon").toggle(300); $("#filter").hide(); });
    $("#filter_toggle").click(function() {
        $("#filter").toggle(300); $("#remocon").hide(); });
    $("#tag_name").keydown(function(e) {
        // if user presses RETURN key
        if (e.keyCode == 13) { $("#tag_ret").focus(); } });
    $("#view,#res,#mylist,#comment").keydown(function(e) {
        // if user presses RETURN key
        if (e.keyCode == 13) { $("#filter_ret").focus(); } });
    $("#range").change(function() {
        if ($(this).val() == "hourly") {
            $(".ranking_genre button").not("#g_all").hide();
        } else {
            $(".ranking_genre button").show();
        } });
    // Request RSS files based on values in remocon function from NicoNico Douga.
    $(".ranking_genre button").click(function() {
        requestRSS({'key': 'ranking',
		    'type': $("#type").val(),
		    'range': $("#range").val(),
		    'genre': $(this).val()}); });
    $("#new").children("button").click(function() {
	requestRSS({'key': 'new', 'genre': $(this).val()}); });
    $("#tag_ret").click(function() {
        requestRSS({'key': 'tag',
		    'tag_name': jQuery.trim($('#tag_name').val()),
		    'sort_by': $('#sort_by').val()}); });
    $("#open_mylist_ret").click(function() {
        requestRSS({'key': 'open_mylist',
	    'open_mylist_num': jQuery.trim($('#open_mylist_num').val())}); });
    // Filter movies, which match values in filter function, from movie lists.
    $("#filter_ret").click(stackFilter);
    $("#filter_clr").click(function() {
        $("li.ranking-item").show();
        for (var i = 0; ++i < 6;) {
            localStorage.removeItem("filter"+i);
        }
        $("#filter_box").empty();
    });
    // data transportation
    $("#transporter_ret").click(function() { transportData(); });
    // Change tab.
    $("#save_selector li").click(function() {
	if ($(this).hasClass("selected")) { return true; }
	$("#save_selector .selected").removeClass("selected");
	$(this).addClass("selected");
	displaySaveData(); });
    // Change bookmark folder.
    $("#bookmark_selector").change(function() { displayBookmark(); });
    // Set default parameter.
    $("#range").val("daily");
    // Bookmark migrate from nicoql8 to nicoql9.
    importBookmark();
    // Displays save data and bookmark.
    displaySaveData();
    displayFilter();
    displayBookmark();

});

/**
 * Functions
 */
function requestRSS(attr) {
    /* requests a RSS file based on *attr* from NicoNico Douga
     * and makes movie list from the RSS file
     *
     * @type attr: dictionary
     * @param attr: data about ranking list
     * @return true or false
     */
    // The number of movie lists should be less than 6.
    var secs = $("#rink").children();
    if (secs.length > 6) {
        alert("1 つのセーブ枠に、セーブできる項目数は 6 個です。");
        return false;
    }
    var rid = makeRID(attr); // Ranking ID
    // The movie list is already made.
    if (secs.is("." + rid)) {return false;} 
    var url = 'http://www.cafe-gentle.jp/cgi-bin/nico/rc.cgi?order=' + rid;
    var $frame = insertFrame(attr); // make frame of movie list
    $.ajax({
        url: url,
        async: true,
        cache: false,
        dataType: 'xml',
        error: function(){
            alert('データを取得できませんでした。');
            $('.' + rid).remove(); // remove frame of movie list
        },
        success: function(xml){
            // Make movie list from RSS file.
            $frame.children(":last").remove(); // delete p.loading elem
            var items = $(xml).find('item');
            if (items.length > 1) {
                $frame.append(frameBody(items));
                save();
            } else {
                $frame.append('<p class="loading">指定されたタグは存在しません。</p>');
            }
            $("#filter_box input").each(function() {
                if (this.checked) {
                    var v = localStorage.getItem($(this).attr("id")).split("+");
                    filterOut($("#" + rid + " li.ranking-item"),
                              v[0], v[1], v[2], v[3],
                              v[4], v[5], v[6], v[7]);
                } 
            });
        }
    });
    return true;
}

function makeRID(attr) {
    /* makes ranking ID from *attr*
     *
     * @type attr: dictionary
     * @param attr: data about ranking list
     * @return ranking ID (str)
     */
    var key = attr['key'];
    if (key == 'ranking') {
        return [key, attr['type'], attr['range'], attr['genre']].join('-');
    } else if (key == 'new') {
        return [key, attr['genre']].join('-');
    } else if (key == 'tag') {
        return [key, attr['tag_name'], attr['sort_by']].join('-');
    } else if (key == "open_mylist") {
        return [key, attr['open_mylist_num']].join('-');
    }
}

function makeRankingURL(attr) {
    /* makes ranking URL from *attr*
     *
     * @type attr: dictionary
     * @param attr: data about ranking list
     * @return ranking URL (str)
     */
    var url = 'http://www.nicovideo.jp/'; // base URI
    var key = attr["key"];
    if (key == 'ranking') {
        url += ['ranking', attr['type'], attr['range'], attr['genre']].join('/');
    } else if (key == 'new') {
        url += attr['genre'];
    } else if (key == 'tag') {
        url += ('tag/' + attr['tag_name'] + '?sort=' + attr['sort_by']);
    } else if (key == 'open_mylist') {
        url += ['mylist', attr['open_mylist_num']].join('/');
    }
    return url;
}

function makeRankingTitle(attr) {
    /* makes ranking title from *attr*
     *
     * @type attr: dictionary
     * @param attr: data about ranking list
     * @return ranking title (str)
     */
    var key = attr['key'];
    if (key == 'ranking') {
        return [{"view": "再生", "res": "コメント", "mylist": "マイリスト", "fav": "総合"}[attr['type']],
                {"hourly": "毎時", "daily": "デイリー", "weekly": "週間",
                 "monthly": "月間", "total": "合計"}[attr['range']],
                {"all": "総合", 
                 "g_ent2": "エンタメ・音楽", "ent": "エンタメ", "music": "音楽", 
                 "sing": "歌ってみた", "play": "演奏してみた",
                 "dance": "踊ってみた", "vocaloid": "VOCALOID", "nicoindies": "インディーズ",
                 "g_life2": "生活・一般・スポ", "animal": "動物", "cooking": "料理", "nature": "自然", 
                 "travel": "旅行", "sport": "スポーツ", "lecture": "ニコ動講座", 
                 "drive": "車載動画", "history": "歴史",
                 "politics": "政治",
                 "g_tech": "科学・技術", "science": "科学", "tech": "技術部",
                 "handcraft": "手芸部", "make": "作ってみた",
                 "g_culture2": "アニメ・ゲーム・絵", "anime": "アニメ", "game": "ゲーム",
                 "toho": "東方", "imas": "IM@S", "radio": "ラジオ", "draw": "描いてみた",
                 "g_other": "その他", "are": "例のアレ", "diary": "日記", "other": "その他"}[attr['genre']]].join('-');
    } else if (key == 'new') {
        return {"newarrival": "新着投稿動画", "recent": "新着コメント動画"}[attr['genre']];
    } else if (key == 'tag') {
        return attr['tag_name'];
    } else if (key == 'open_mylist') {
        return 'マイリストID: ' + attr['open_mylist_num'];
    }
}

function stackRanking(rid, title) {
    /* embeds RID and ranking title in remocon-box 
     *
     * @type rid: str
     * @param rid: ranking ID 
     * @type title: str
     * @param title: ranking title
     * @return false
     */
    var d = document;
    var $span = $(d.createElement("span"));
    $span.addClass(rid)
        .text(title)
        .append($(d.createElement("span"))
		.addClass("close")
		.click(function() {
                    // escape RID to use jQuery remove method
                    rid = rid.replace(/([ \@#;&,.%+*~\':"!^$[\]()=>|\/])/g,'\\$1');
                    $("." + rid).remove();
                    save();
                })       
        );
    $("#remocon_box").append($span);
    return false;
}

/**
 * Around filtering
 */
function compare(a, b, ou) {
    // Compare function to filter out.
    // ou is Over or Under.
    if (ou == "over") {
        return a >= b;
    } else {
        return a < b;
    }
}

function isInPeriod(_p, pubdate) {
    /* checks whether *_p* is during *pubdate*.
     * 
     * @type _p: str
     * @param _p: "nico-info-date" value of a movie
     * @type pubdate: int
     * @param pubdate: publishing date
     * @return: true or false
     */
    if (pubdate === 0) { return true; }
    var dd = new Date();
    dd.setTime(dd.getTime() - (pubdate * 24 * 3600 * 1000));
    var y = dd.getFullYear();
    var m = dd.getMonth() + 1;
    var d = dd.getDate();
    m = (m < 10) ? '0' + m : m;
    d = (d < 10) ? '0' + d : d;
    var threshold = y + '年' + m + '月' + d + '日';
    return _p > threshold;
}

function filterOut($items, view, view_ou, res, res_ou, mylist, mylist_ou,
                   pubdate, comment) {
    /* filters out movie in ranking lists.
     *
     * @type $items: jQuery element instances
     * @param $items: ranking items which should be filtered
     * @type view: int
     * @param view: The number of view to filter movies
     * @type view_ou: string
     * @param view_ou: "over" or "under"
     * @type res: int
     * @param res: The number of res to filter movies
     * @type res_ou: string
     * @param res_ou: "over" or "under"
     * * @type mylist: int
     * @param mylist: The number of mylist to filter movies
     * @type mylist_ou: string
     * @param mylist_ou: "over" or "under"
     * * @type pubdate: int
     * @param pubdate: publishing date to filter movies
     * @type comment: str
     * @param comment: query to filter movies
     * @return: false
     */
    $items.each(function() {
        var _v = $(this).find(".nico-info-total-view").text().replace(/,/g, '') - 0;
        var _r = $(this).find(".nico-info-total-res").text().replace(/,/g, '') - 0;
        var _m = $(this).find(".nico-info-total-mylist").text().replace(/,/g, '') - 0;
        if (!(compare(_v, view, view_ou) && 
              compare(_r, res, res_ou) &&
              compare(_m, mylist, mylist_ou))) {
               $(this).hide(); 
        }
        var _p = $(this).find(".nico-info-date").text(); 
        if (pubdate != 0 && !isInPeriod(_p, pubdate)) { $(this).hide(); }
        var title = $(this).find(".movie_title").text();
        var desc = $(this).find(".nico-description").text();
        if (title.indexOf(comment) == -1 && desc.indexOf(comment) == -1) {
            $(this).hide(); 
        }
    });
    return false;
}

function stackFilter() {
    /* embeds title and condition for filtering in remocon-box
     *
     * @return: return false
     */
    var view = $("#view").val() - 0; // from str to int
    var res = $("#res").val() - 0;
    var mylist = $("#mylist").val() - 0;
    var view_ou = $("#view_ou").val();
    var res_ou = $("#res_ou").val();
    var mylist_ou = $("#mylist_ou").val();
    var pubdate = $("#period").val() - 0;
    var comment = jQuery.trim($("#comment").val());
    comment = comment.replace('+', '＋'); // escape 
    if (isNaN(view) || isNaN(res) || isNaN(mylist)) {
        alert("数値を入力してください。");
        return false;
    }
    for (var i = 0; ++i < 6;) {
        var filterID = "filter" + i;
        if (localStorage.getItem(filterID) === null) {break;}
    }
    if (i == 6) {
        alert("フィルターは最大 5 つまでです。");
        return false;
    }
    localStorage.setItem(filterID, [view, view_ou,
                                    res, res_ou,
                                    mylist, mylist_ou,
                                    pubdate, comment].join('+'));
    $("#filter_box").append(filterCheckbox(filterID));
    return false;
}

function displayFilter() {
    /* loads saved filter from localStorage and
     * makes movie lists from the saved data
     *
     * @return: false
     */
    $("#filter_box").empty();
    for (var i = 0; ++i < 6;) {
        $("#filter_box").append(filterCheckbox("filter" + i));
    }    
    return false;
}

/**
 * Around save data of ranking IDs
 */
function load() {
    /* loads saved data of ranking IDs from localStorage
     * 
     * @return: a list of ranking IDs 
     */
    var groupID = $("#save_selector .selected").attr("id");
    var s = localStorage.getItem(groupID);
    return (s == "" || s === null || s === "undefined") ? [] : s.split('+');
}

function save() {
    /* saves displayed ranking IDs to localStorage
     *
     * @return: false
     */
    var groupID = $("#save_selector .selected").attr("id");
    var rankingIDs = [];
    $("#rink").children().not("#bookmark").each(function() {
        rankingIDs.push($(this).attr("id"));
    });
    localStorage.setItem(groupID, rankingIDs.join('+'));
    return false;
} 

function displaySaveData() {
    /* loads saved data of ranking IDs from localStorage and
     * makes movie lists from the saved data
     *
     * @return: false
     */
    $("#rink").children().not("#bookmark").remove();
    $("#remocon_box").empty();
    var rankingIDs = load();
    for (var i = -1, n = rankingIDs.length; ++i < n;) {
	var data = rankingIDs[i].split('-');
	var key = data[0];
        var attr = {'key': key};
        if (key == 'ranking') {
            attr['type'] = data[1];
            attr['range'] = data[2];
            attr['genre'] = data[3];
        } else if (key == 'new') {
            attr['genre'] = data[1];
        } else if (key == 'tag') {
            // CAUTION: we must escape "-".
            // At this time, data is broken.
            data.shift();
            attr['sort_by'] = data.pop();
            attr['tag_name'] = data.join("-"); 
        } else if (key == 'open_mylist') {
            attr['open_mylist_num'] = data[1];
        }
        requestRSS(attr);
    }    
    return false;
}

/**
 * Preview Movie Detail
 */
function previewMovieDetail(movieID) {
    /* displays movie detail by overlay
     *
     * @type movieID: str
     * @param movieID: movieID defined in NicoNico Douga
     * @return: false
     */
    if ($('#movie_detail').is(':visible')) {
        $('#movie_detail').hide(300);
        return false;
    }
    $.ajax({
        type: "GET",
        url: 'http://www.cafe-gentle.jp/cgi-bin/nico/ranking_collection.cgi',
        dataType: "xml",
        data: 'movieID=' + movieID,
        success: function(xml) {
            var $xml = $(xml);
	    window_height = $(window).height();
	    min_height = Math.min(window_height-100, 600);
            $('#movie_detail_title').text($xml.find('title').text());
            $('#movie_detail_first_retrieve').text($xml.find('first_retrieve').text());
            $('#movie_detail_length').text($xml.find('length').text());
            $('#movie_detail_view').text($xml.find('view_counter').text());
            $('#movie_detail_res').text($xml.find('comment_num').text());
            $('#movie_detail_mylist').text($xml.find('mylist_counter').text());
            $('#movie_detail_tags').text($xml.find('tags').text());
            $('#movie_detail_last_res_body').text($xml.find('last_res_body').text());
            $('#movie_detail_description').text($xml.find('description').text());
            $('#movie_detail_thumbnail').find('img')
                .attr('src', $xml.find('thumbnail_url').text());
            $('#movie_detail').height(min_height).show(300);
        },
        error: function() {alert("通信エラーが発生しました。");}, 
    });
    return false;
}

/**
 * Around bookmark
 */
function mark(movieID) {
    /* marks a movie.(Bookmark)
     * 
     * @type movieID: str
     * @param movieID: a movie ID to mark 
     * @return: true or false
     */
    // Load bookmarked data.
    var groupID = $("#bookmark_selector option:selected").val();
    var s = localStorage.getItem(groupID);
    var movielist = (s === null) ? [] : s.split('+');
    if (movielist.length >= 100) {
        alert("お気に入りに登録できる動画は 100 個までです。");
        return false;
    }
    // Save bookmarked data.
    movielist.push(movieID);
    var $movie_item = $("li[title='" + movieID + "']:first img");
    var movie_title = $movie_item.attr("alt");
    movie_title = movie_title.replace('+', '＋'); // escape
    var thumbnail_url = $movie_item.attr("src");
    localStorage.setItem(groupID, movielist.join('+'));
    localStorage.setItem(movieID, [movie_title, thumbnail_url].join('+'));
    // Change from buttons to mark to buttons to unmark in rink.
    $("li[title='" + movieID + "'] a.mark_button").each(function () {
	$(this).text("★")
	    .unbind('click', mark)
            .click(function () {unmark(movieID);});
    });
    // Display bookmarked data.
    $("#marked_list").append(frameMarkedItem(movieID, movie_title, thumbnail_url, groupID));
    return true;
}

function unmark(movieID) {
    /* unmarks a movie.(Bookmark)
     * 
     * @type movieID: str
     * @param movieID: a movie ID to mark 
     * @return: true or false
     */
    $("#bookmark_selector option").each(function () {
	var groupID = $(this).val();
        // Load bookmarked data.
	var s = localStorage.getItem(groupID);
	var movies = (s === null) ? [] : s.split('+');
	var index = $.inArray(movieID, movies);
	if (index == -1) { return true; } // continue
	movies.splice(index, 1);
        // Update bookmarked data.
	localStorage.removeItem(movieID);
	localStorage.setItem(groupID, movies.join('+'));
    });   
    $("#marked_list li.marked-item[title='" + movieID + "']").remove();
    // Change from buttons to unmark to buttons to mark in rink.
    $("li[title='" + movieID + "'] a.mark_button").each(function () {
	$(this).text("☆")
            .unbind('click', unmark)
            .click(function () {mark(movieID);}); });
    return true;
}

/**
 * Around importing/exporting savedata and bookmark
 */
function transportData() {
    /* imports savedata and bookmarks from the server, 
     * or exports them to the server.
     */
    var type = $("#import_or_export").val();
    var username = $("#transporter_username").val();
    var password = $("#transporter_password").val();
    var transported_data = {"type": type,
            "username": username,
            "password": password,};
    if (type === 'export') {
        for (var i = -1, n = localStorage.length; ++i < n;) {
            key = localStorage.key(i);
            transported_data[key] = localStorage[key];
        } 
    }
    $.ajax({
        type: 'POST',
        url: 'http://www.cafe-gentle.jp/cgi-bin/nico/nicoql-data_transporter.cgi',
        data: transported_data,
        success: function(data) {
               if (type === "import") { importDataProcess(data); }
               else if (type === "export") { exportDataProcess(data); }
              },
        error: function() {alert("通信エラーが発生しました。");}, 
        dataType: "json"
    });
    return true;
}

function importDataProcess(data) {
    /* writes the imported savedata and bookmarks into the localStorage.
     *
     * @type data: json
     * @param data: imported savedata and bookmarks
     */
    if (data["error"] === "true") {
        alert("該当するデータがありませんでした。");
        return false;
    } else {
        // import savedata
        for (key in data) {
            if (key === "error") {
                continue;
            } else {
                localStorage.setItem(key, data[key]);
            }
        }
        location.reload();
        return true;
    }
}

function exportDataProcess(data) {
    /* writes the savedata and bookmarks in the localStorage to the server.
     *
     * @type data: json
     * @param data: savedata and bookmarks to export
     */
    if (data["error"] === "true") {
        alert("ユーザ名かパスワードに英数字以外が使われているか、"+
              "他の人が既に同じユーザ名およびパスワードを使用しています。");
        return false;
    } else {
        alert("データのエクスポートが完了しました。1 時間以内に他のブラウザでデータをインポートして下さい。");
        return true;
    }
}

function frameMarkedItem(movieID, title, thumbnail_url, groupID) {
    /* makes html code to display a bookmarked movie.
     * 
     * @type movieID: str
     * @param movieID: a movie ID to mark 
     * @type title: str
     * @param title: a movie title to mark 
     * @type thumbnail_url: str
     * @param thumbnail_url: a thumbnail URI to mark 
     * @type groupID: str
     * @param groupID: bookmark folder ID 
     * @return: html code to display a bookmarked movie
     */
    var d = document;
    var url = 'http://www.nicovideo.jp/watch/' + movieID;
    var $thumbnail = $(d.createElement("p"))
	.addClass("nico-thumbnail")
	.append($(d.createElement("img"))
		.attr({"alt": title, "src": thumbnail_url,
		       "width": 94, "height": 70, "border": 0}));
    var $itemHeader = $(d.createElement("div"))
        .addClass("movie_title")
        .append($(d.createElement("a"))
                .attr("href", url)
                .text(title))
        .append($(d.createElement("a"))
                .attr({"class": "blank", "href": url, "target": "_blank"})
                .text("[別窓表示]"));
    var $selector = $('<div class="fn_buttons"><label class="bsl">移動先:' + 
                      '<select class="bs"><option value="mark_group0">未分類</option>' +
		      '<option value="mark_group1">グループA</option>' +
		      '<option value="mark_group2">グループB</option>' +
		      '<option value="mark_group3">グループC</option></label></select></div>')
	.val(groupID)
	.change(function () { moveMark(movieID,
				$("select",this).children(":selected").val()); });
    return $(d.createElement("li"))
        .attr({"class": "marked-item", "title": movieID})
        .append($thumbnail)
        .append($itemHeader)
        .append(itemFnButtons(movieID))
	.append($selector);
}

function moveMark(movieID, dst_groupID) {
    /* moves marked movie from a certain folder to the other one. 
     *
     * @type movieID: str
     * @param movieID: an movie ID which a user need to move
     * @type dst_groupID: str
     * @param dst_groupID: a bookmark folder ID to which move the marked movie 
     * @return: true or false
     */
    // Delete marked movie from a certain folder.
    var groupID = $("#bookmark_selector option:selected").val();
    var s = localStorage.getItem(groupID);
    var movies = (s === null) ? [] : s.split('+');
    var index = $.inArray(movieID, movies);
    if (index == -1) { return false; } // continue
    movies.splice(index, 1);
    localStorage.setItem(groupID, movies.join('+'));
    // Add marked movie from a certain folder.
    s = localStorage.getItem(dst_groupID);
    var movielist = (s === null) ? [] : s.split('+');
    movielist.push(movieID);
    localStorage.setItem(dst_groupID, movielist.join('+'));
    $("#bookmark_selector").val(dst_groupID);
    displayBookmark();
    return true;
}

function loadBookmark(groupID) {
    /* loads a list of marked movie IDs from bookmark.
     * 
     * @type groupID: str
     * @param groupID: a bookmark folder ID to load bookmarked data
     * @return: a list of marked movie IDs 
     */
    var s = localStorage.getItem(groupID);
    return (s === null) ? [] : s.split('+');
}

function importBookmark() {
    /* Bookmark migrates from nicoql8 to nicoql9. 
     *
     * @return: false
     */
    var s = localStorage.getItem('markedMovies');
    if (s !== null) {
	var groupID = $("#bookmark_selector option:selected").val();
	localStorage.setItem(groupID, s);
	localStorage.removeItem('markedMovies');
    }
    return false;
}

function displayBookmark() {
    /* loads and displays bookmarked data.
     *
     * @return: false
     */
    var $shelf = $("#marked_list");
    $shelf.empty(); // init
    var groupID = $("#bookmark_selector option:selected").val();
    var movieIDs = loadBookmark(groupID);
    for (var i = -1, n = movieIDs.length; ++i < n;) {
        var movieID = movieIDs[i];
	if (movieID === '') {continue;}
        var s = localStorage.getItem(movieID);
        if (s === null) { continue; }
	var movie_info = s.split('+');
	$shelf.append(frameMarkedItem(movieID,
				      movie_info[0],
				      movie_info[1],
				      groupID));
    }
    return false;
}

/**
 * Makes a snipet of html
 */
function insertFrame(attr) {
    /* makes and inserts a frame of movie list into a rink.
     *
     * @type attr: dictionary
     * @param attr: data about ranking list
     * @return: the maked frame 
     */
    var $frame = frame(attr);
    $("#rink").children().each(function() {
        if ($frame.attr("id") >= this.id) { // sorted by RID
            $(this).before($frame);
            return false;
        } else if ($(this).is(":last")) {
            $("#rink").append($frame);
        }
    });
    return $frame;
}

function frame(attr) {
    /* makes a frame of a ranking list.
     *
     * @type attr: dictionary
     * @param attr: data about ranking list
     * @return: the maked frame 
     */
    var d = document;
    var rid = makeRID(attr);
    var title = makeRankingTitle(attr);
    var url = makeRankingURL(attr);
    stackRanking(rid, title);
    return $(d.createElement("section"))
        .attr({"id": rid, "class": rid})
        .append(frameHeader(title, url, rid))
        .append('<p class="loading">読み込み中...</p>');
}

function frameHeader(title, url, rid) {
    /* makes a frame header of a ranking list.
     *
     * @type title: str
     * @param title: a title of inputted ranking
     * @type url: str
     * @param url: an url of inputted ranking
     * @type rid: str
     * @param rid: a ranking ID of inputted ranking    
     * @return: the maked frame header 
     */
    var d = document;
    var $hl = $(d.createElement("h1"))
	.append($(d.createElement("a")).attr("href", url).text(title));
    var $span = $(d.createElement("span"))
	.addClass("close")
	.click(function(e) {
            rid = rid.replace(/([ \@#;&,.%+*~\':"!^$[\]()=>|\/])/g,'\\$1');
	    $("." + rid).remove();
	    save();
	});
    return $(d.createElement("header")).append($hl).append($span);
}

function frameBody(items) {
    /* makes a frame body of a ranking list.
     *
     * @type items: xml parsed by jQuery
     * @param items: xml within item tag of RSS   
     * @return: the maked frame body 
     */
    var d = document;
    var $ol = $(d.createElement("ol"));
    for (var i = -1, n = items.length; ++i < n;) {
        var $item = $(items[i]);
        var title = $item.find("title").text();
        var url = $item.find("link").text();
        var desc = $item.find("description").text();
        $ol.append(frameBodyItem(title, url, desc));
    }
    return $ol;
}

function frameBodyItem(title, url, desc) {
    /* makes an item of a frame body of a ranking list.
     *
     * @type title: str
     * @param title: a title of movie
     * @type url: str
     * @param url: an url of movie
     * @type desc: str (html)
     * @param desc: a description of movie
     * @return: the maked item header 
     */   
    var d = document;
    var movieID = url.split("/").pop();
    var $comment = $(d.createElement("div")).addClass("popup").html(desc).hide(); 
    return $(d.createElement("li"))
        .attr({"class": "ranking-item", "title": movieID})
        .append($comment.find(".nico-thumbnail"))
        .append(itemHeader(title, url))
        .append(itemFnButtons(movieID))
        .append($comment.find(".nico-info-length"))
        .append($comment);
}

function itemHeader(title, url) {
    /* makes an item header of a frame body of a ranking list.
     *
     * @type title: str
     * @param title: a title of movie
     * @type url: str
     * @param url: an url of movie
     * @return: the maked item header 
     */
    var d = document;
    return $(d.createElement("div"))
        .addClass("movie_title")
        .hover(function(e) {
                if (window.innerHeight - e.pageY < 200) {
                    $(this).siblings(":last").css("top", "20px").show();
                } else {
                    $(this).siblings(":last").css("bottom", "20px").show();
                }
               },
               function() {$(this).siblings(":last").removeAttr("style").hide();})
        .append($(d.createElement("a"))
                .attr("href", url)
                .text(title))
        .append($(d.createElement("a"))
                .attr({"class": "blank", "href": url, "target": "_blank"})
                .text("[別窓表示]"));
}

function itemFnButtons(movieID) {
    /* makes function buttons in an item of a frame body of a ranking list.
     *
     * @type movieID: string
     * @param movieID: an ID of movie
     * @return: the maked function buttons 
     */
    var d = document;
    var $mark_button = $(d.createElement("a")).addClass("mark_button");
    if (localStorage.getItem(movieID) === null) {
        $mark_button = $mark_button.text("☆").click(function() {mark(movieID);});
    } else {
        $mark_button = $mark_button.text("★").click(function() {unmark(movieID);});
    }
    return $(d.createElement("div"))
        .addClass("fn_buttons")
        .append($(d.createElement("a"))
                .text("詳細")
                .click(function() {previewMovieDetail(movieID);}))
        .append($(d.createElement("a"))
                .attr("href", "http://dic.nicovideo.jp/v/" + movieID)
                .text("大百科"))
        .append($mark_button);
}

function filterCheckbox(filterID) {
    /* makes function checkbox.
     *
     * @type filterID: string
     * @param filterID: an ID of filter
     * @return: the maked filter checkbox
     */
    var d = document;
    try {
        var v = localStorage.getItem(filterID).split("+");
    }
    catch(e) { 
        return false;
    }
    var $span = $(d.createElement("span"));
    $span.addClass(filterID)
        .append($(d.createElement("input"))
                .attr("id", filterID)
                .attr("type", "checkbox")
                .attr("value", filterID)
                .change(function() {
                    $("li.ranking-item").show();
                    $("#filter_box input").each(function() {
                        if (this.checked) {
                            var id = $(this).attr("id");
                            var v = localStorage.getItem(id).split("+");
                            filterOut($("li.ranking-item"), 
                                      v[0], v[1], v[2], v[3],
                                      v[4], v[5], v[6], v[7]);
                        } 
                    }); 
                }))
        .append($(d.createElement("label"))
                .attr("for", filterID)
                .attr("title", "再生数:" + v[1] + v[0] + "-コメ数:" +
                      v[3] + v[2] + "-マイリス数:" + v[5] + v[4] +
                      "-投稿日時:" + v[6] + "日以内-キーワード:" + v[7])
                .text(filterID.toUpperCase()))
        .append($(d.createElement("span"))
                .addClass("close")
                .click(function() {
                    $("." + filterID).remove();
                    localStorage.removeItem(filterID);
                }));
    return $span;
}
