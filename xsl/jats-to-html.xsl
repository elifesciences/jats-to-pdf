<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    xmlns:mml="http://www.w3.org/1998/Math/MathML"
    xmlns:ali="http://www.niso.org/schemas/ali/1.0/"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:e="https://elifesciences.org/namespace"
    exclude-result-prefixes="xs xsi xlink mml ali e"
    version="3.0">
    
    <xsl:output method="html" indent="no"/>
    
    <xsl:template match="@*|node()">
        <xsl:choose>
            <xsl:when test="self::processing-instruction()">
                <xsl:if test="name()='page-break'">
                    <div class="pagebreak"/>
                </xsl:if>
            </xsl:when>
            <xsl:otherwise>
                <xsl:copy copy-namespaces="no">
                    <xsl:apply-templates select="node()"/>
                </xsl:copy>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <xsl:variable name="html-head">
        <head>
            <meta charSet="utf-8" />
            <meta name="viewport" content="width=device-width" />
            <title>
                <xsl:value-of select="/article//article-meta/title-group/article-title/data(.)"/>
            </title>
            <link rel="preload" href="print.css" as="style"/>
            <link rel="stylesheet" href="print.css"/>
            <xsl:if test="descendant::processing-instruction()">
                <xsl:call-template name="inject-styling"/>
            </xsl:if>
        </head>
    </xsl:variable>
    
    <xsl:variable name="runninghead">
        <xsl:variable name="pub-year">
            <xsl:choose>
                <xsl:when test="/article//article-meta/pub-history/event[date[@date-type='reviewed-preprint']]">
                    <xsl:value-of select="/article//article-meta/pub-history/event[date[@date-type='reviewed-preprint']][1]/date[@date-type='reviewed-preprint'][1]/year[1]"/>
                </xsl:when>
                <xsl:when test="/article//article-meta/pub-date">
                    <xsl:value-of select="/article//article-meta/pub-date[1]/year[1]"/>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:value-of select="year-from-date(current-date())"/>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <p class="runninghead">
            <span class="author">
                <xsl:value-of select="e:get-copyright-holder(/article//article-meta/contrib-group[1])"/>
                <xsl:text>,</xsl:text>
            </span>
            <xsl:text>&#xA0;</xsl:text>
            <span class="date">
                <xsl:value-of select="$pub-year"/>
                <xsl:text>&#xA0;</xsl:text>
                <em>eLife</em>
                <xsl:text>&#xA0;</xsl:text>
                <strong>
                    <xsl:value-of select="number($pub-year) - 2011"/>
                </strong>
                <xsl:text>:</xsl:text>
                <xsl:value-of select="concat('RP',$msid)"/>
                <xsl:text>.</xsl:text>
            </span>
            <xsl:text>&#xA0;</xsl:text>
            <span class="doi">
                <xsl:text>&#xA0;</xsl:text>
                <xsl:variable name="version-doi-url" select="concat('https://doi.org/',$version-doi)"/>
                <a>
                    <xsl:attribute name="href">
                        <xsl:value-of select="$version-doi-url"/>
                    </xsl:attribute>
                    <xsl:value-of select="$version-doi-url"/>
                </a>
            </span>
            <span class="counter"/>
        </p>
    </xsl:variable>
    
    <xsl:variable name="first-page-banner">
        <div id="first-page-links" class="elife-intro">
            <a id="logo" href="https://elifesciences.org/?utm_source=pdf&amp;utm_medium=article-pdf&amp;utm_campaign=PDF_tracking">
                <img alt="eLife logo" loading="eager" width="80" height="30" decoding="async" data-nimg="1" 
                        class="site-header__logo" style="color:transparent" src="https://elifesciences.org/assets/patterns/img/patterns/organisms/elife-logo-xs.fd623d00.svg"/>
            </a> 
            <div id="right-header-links">
                <a href="https://en.wikipedia.org/wiki/Open_access" target="_blank" class="header-icon oa-icon"></a>
                <span class="separator">|</span>
                <a href="https://creativecommons.org/" target="_blank" class="header-icon cc-icon"></a>
            </div>
        </div>
    </xsl:variable>
    
    <xsl:variable name="page-templates">
        <div id="page-templates">
            <xsl:copy-of select="$runninghead"/>
            <xsl:apply-templates select=".//article-meta/article-categories"/>
            <xsl:copy-of select="$first-page-banner"/>
        </div>
    </xsl:variable>
    
    <!-- Introduces procedural styling into the CSS cascade -->
    <xsl:template name="inject-styling">
        <style media="print">
            <xsl:apply-templates mode="inject-styling" select="descendant::processing-instruction()"/>
        </style>
    </xsl:template>
    
    <!-- Generate custom css for resizing figure images -->
    <xsl:template mode="inject-styling" match="processing-instruction('fig-class')">
        <xsl:variable name="size-style-map" select="map{
                    'full':'max-width: 120% !important; margin-left: -120px !important; max-height: 900px !important; height: auto !important;',
                    'half':'max-width: 90% !important; max-height: unset !important; height: auto !important; text-align: center !important;',
                    'quarter':'max-width: 60% !important; max-height: unset !important; height: auto !important; text-align: center !important;'
                    }"/>
        <xsl:variable name="fig-id" select="following-sibling::*[self::fig or self::table-wrap[graphic or alternatives/graphic]][1]/@id"/>
        <xsl:value-of select="'#'||$fig-id||' {--not-to-fill: ok; break-before: page;} 
            #'||$fig-id||' > img {'||$size-style-map(normalize-space(.))||'}'"/>
    </xsl:template>
    
    <!-- Another method to generate custom css for resizing figure images -->
    <xsl:template mode="inject-styling" match="processing-instruction('fig-width')">
        <xsl:variable name="fig-id" select="following-sibling::*[self::fig or self::table-wrap[graphic or alternatives/graphic]][1]/@id"/>
        <xsl:variable name="continued-attribute" select="'ctn-'||$fig-id"/>
        <xsl:value-of select="'#'||$fig-id||' > img, figure[data-continued-from=&quot;'||$continued-attribute||'&quot;] {width: '||normalize-space(.)||' !important; max-width: '||normalize-space(.)||' !important;}'"/>
    </xsl:template>
    
    <xsl:template mode="inject-styling" match="processing-instruction('math-size')">
        <xsl:variable name="id" select="following-sibling::*[name()=('disp-formula','inline-formula')][1]/@id"/>
        <xsl:if test="$id!=''">
            <xsl:value-of select="'#'||$id||' {height: '||normalize-space(.)||'rem !important}'"/>
        </xsl:if>
    </xsl:template>
    
    <xsl:template match="/">
        <html>
            <xsl:copy-of select="$html-head"/>
            <body>
                <xsl:copy-of select="$page-templates"/>
                <xsl:apply-templates select="/article"/>
            </body>
        </html>
    </xsl:template>
    
    <xsl:template match="article">
        <article>
            <xsl:call-template name="aside"/>
            <xsl:call-template name="header"/>
            <xsl:call-template name="main"/>
        </article>
    </xsl:template>
    
    <xsl:variable name="version-doi" select="article//article-meta/article-id[@pub-id-type='doi' and @specific-use='version']"/>
    <xsl:variable name="msid" select="if (not($version-doi='')) then tokenize($version-doi,'\.')[3] else ''"/>
    <xsl:variable name="rp-version" select="if (not($version-doi='')) then tokenize($version-doi,'\.')[last()] else ''"/>
    <xsl:variable name="iiif-base-uri" select="concat(
                    'https://prod--epp.elifesciences.org/iiif/2/',
                    $msid,
                    '%2Fv',
                    $rp-version,
                    '%2Fcontent%2F'
                    )"/>
    
    <xsl:template name="header">
        <header id="header" class="content-header">
            <xsl:apply-templates select=".//article-meta/title-group/article-title"/>
            <xsl:apply-templates mode="authors-in-header" select=".//article-meta/contrib-group[1]"/>
        </header>
    </xsl:template>
    
    <xsl:template match="article-categories">
            <ul class="article-flag-list">
            <xsl:for-each select="./subj-group[@subj-group-type='heading']">
                <xsl:variable name="msa-url" select="concat(
                    'https://elifesciences.org/subjects/',
                    replace(replace(lower-case(./subject[1]),'\s(and|of)',''),'\s','-')
                    )"/>
                <li class="article-flag-list__item">
                    <a class="article-flag__link" href="{$msa-url}">
                        <xsl:value-of select="./subject"/>
                    </a>
                </li>
            </xsl:for-each>
        </ul>
    </xsl:template>
    
    <xsl:template match="article-meta/title-group/article-title">
        <h1 class="title">
            <xsl:apply-templates select="node()"/>
        </h1>
    </xsl:template>
    
    <xsl:template match="article-meta/article-id[@pub-id-type='doi' and not(@specific-use)]">
        <xsl:variable name="doi-url" select="concat('https://doi.org/',.)"/>
        <div id="cite-all-versions" class="cite-all-versions">
            <h2>Cite all versions</h2>
            <p>
                <xsl:text>You can cite all versions using the DOI </xsl:text>
                <a href="https://doi.org/10.7554/eLife.108292">
                    <xsl:attribute name="hred">
                        <xsl:value-of select="$doi-url"/>
                    </xsl:attribute>
                    <xsl:value-of select="$doi-url"/>
                </a>
            <xsl:text>. This DOI represents all versions, and will always resolve to the latest one.</xsl:text>
            </p>
        </div>
    </xsl:template>
    
    <xsl:template name="article-notes">
        <section id="margin-notes">
            <xsl:apply-templates select="//article-meta/author-notes"/>
            <xsl:apply-templates select="//article-meta/contrib-group[2][contrib]"/>
            <xsl:apply-templates select="//article-meta/permissions"/>
        </section>
    </xsl:template>
    
    <xsl:template match="article-meta/permissions">
        <div id="copyright" class="copyright">
            <p>
                <xsl:if test="copyright-statement">
                    <xsl:apply-templates select="copyright-statement[1]/node()"/>
                    <xsl:text>. </xsl:text>
                </xsl:if>
                <xsl:apply-templates select="license/license-p/node()"/>
            </p>
        </div>
    </xsl:template>
    
    <!-- To do: Handle group authors? -->
    <xsl:template mode="authors-in-header" match="article-meta/contrib-group[1]">
        <xsl:variable name="has-multiple-affiliations" select="count(aff) gt 1" as="xs:boolean"/>
        <div class="authors">
            <ol class="authors-list authors-list--expanded" aria-label="Authors of this article">
                <xsl:variable name="note-types" select="('author-notes','fn','author-note','equal')"/>
                <xsl:for-each select="./contrib[@contrib-type='author']|./on-behalf-of">
                    <xsl:variable name="email-class" select="if (./email or ./xref[@ref-type='corresp']) then 'authors-email__link' else ''"/>
                    <xsl:variable name="organisation-class" select="if (self::on-behalf-of or ./collab[not(contrib or contrib-group)]) then 'organisation' else ''"/>
                    <xsl:variable name="author-class" select="string-join(
                        ('authors-link',$email-class,$organisation-class)[.!='']
                        ,' ')"/>
                    <xsl:choose>
                        <xsl:when test="self::contrib">
                            <li class="authors-list__item">
                                <span class="{$author-class}">
                                    <xsl:choose>
                                        <xsl:when test="./name">
                                            <xsl:apply-templates select="./name[1]"/>
                                        </xsl:when>
                                        <xsl:when test="./string-name">
                                            <xsl:apply-templates select="./string-name[1]"/>
                                        </xsl:when>
                                        <xsl:when test="collab">
                                            <xsl:apply-templates select="./collab[1]"/>
                                        </xsl:when>
                                        <xsl:otherwise/>
                                    </xsl:choose>
                                    <xsl:if test="xref">
                                        <xsl:variable name="xrefs-to-add" select="if ($has-multiple-affiliations) then ($note-types,'aff')
                                            else $note-types"/>
                                        <xsl:for-each select="xref[@ref-type=$xrefs-to-add]">
                                            <sup>
                                                <xsl:value-of select="."/>
                                                <xsl:if test="position() lt last()">
                                                    <xsl:text>,</xsl:text>
                                                </xsl:if>
                                            </sup>
                                        </xsl:for-each>
                                    </xsl:if>
                                    <xsl:if test="email or xref[@ref-type='corresp']">
                                        <xsl:choose>
                                            <xsl:when test="email">
                                                <a href="{concat('mailto:',email[1])}">
                                                    <span class="email-icon"/>
                                                </a>
                                            </xsl:when>
                                            <xsl:otherwise>
                                                <span class="email-icon"/>
                                            </xsl:otherwise>
                                        </xsl:choose>
                                    </xsl:if>
                                </span>
                            </li>
                        </xsl:when>
                        <xsl:otherwise>
                            <li class="authors-list__item">
                                <span class="{$author-class}">
                                    <xsl:apply-templates select="node()"/>
                                </span>
                            </li>
                        </xsl:otherwise>
                    </xsl:choose>
                </xsl:for-each>
            </ol>
        </div>
        <div class="institutions">
            <ol class="institutions-list" aria-label="Author institutions">
                <xsl:for-each select="aff">
                    <!-- To do: account for NOT mixed-content -->
                    <li class="institutions-list__item">
                        <xsl:if test="$has-multiple-affiliations">
                            <sup>
                                <xsl:value-of select="./label[1]"/>
                            </sup>
                        </xsl:if>
                        <xsl:apply-templates select="descendant::*[not(local-name()=('label','institution-id','institution-wrap','named-content'))]|text()"/>
                    </li>    
                </xsl:for-each>
            </ol>
        </div>
    </xsl:template>
    
    <!-- To do: add full support for group authors -->
    <xsl:template mode="authors-in-back" match="article-meta/contrib-group[1]">
        <xsl:if test="contrib[@contrib-type='author' and contrib-id[@contrib-id-type='orcid']]">
            <section id="orcids">
                <h2 class="orcid-list__title">Author ORCID iDs</h2>
                <ul class="orcid-list list-simple">
                    <xsl:for-each select="./contrib[@contrib-type='author' and name and contrib-id[@contrib-id-type='orcid']]">
                        <li class="orcid-list-item">
                            <p>
                                <strong>
                                    <xsl:apply-templates select="./name[1]"/>
                                </strong>
                                <xsl:text>: </xsl:text>
                                <a>
                                    <xsl:attribute name="href">
                                        <xsl:value-of select="contrib-id[@contrib-id-type='orcid'][1]"/>
                                    </xsl:attribute>
                                    <xsl:if test="contrib-id[@contrib-id-type='orcid'][1]/@authenticated='true'">
                                        <span class="orcid-icon"/>
                                    </xsl:if>
                                    <xsl:value-of select="contrib-id[@contrib-id-type='orcid'][1]"/>
                                </a>
                            </p>
                        </li>
                    </xsl:for-each>
                </ul>
            </section>
        </xsl:if>
        <xsl:if test="$author-notes-max-exceeded">
            <section id="author-notes-expanded">
                <h2 class="author-notes-expanded__title">Author notes</h2>
                <ul class="author-notes-expanded-list list-simple">
                    <xsl:for-each select="parent::article-meta/author-notes/*[self::fn or self::corresp]">
                        <xsl:variable name="id" select="@id"/>
                        <xsl:variable name="author-contribs" select="ancestor::article-meta/contrib-group[1]/contrib[@contrib-type='author' and xref[@rid=$id]]"/>
                        <li class="author-notes-expanded-list-item">
                            <p>
                                <xsl:if test="$author-contribs">
                                    <strong>
                                        <xsl:for-each select="$author-contribs">
                                            <xsl:apply-templates select="./name[1]"/>
                                            <xsl:choose>
                                                <xsl:when test="position() = last()">
                                                    <xsl:text>:</xsl:text>
                                                </xsl:when>
                                                <xsl:otherwise>
                                                    <xsl:text>, </xsl:text>
                                                </xsl:otherwise>
                                            </xsl:choose>
                                        </xsl:for-each>
                                    </strong>
                                    <xsl:text> </xsl:text>
                                </xsl:if>
                                <xsl:choose>
                                    <xsl:when test="name()='fn'">
                                        <xsl:apply-templates select="./p/node()"/>
                                    </xsl:when>
                                    <xsl:otherwise>
                                        <xsl:apply-templates select="./node()[not(self::label)]"/>
                                    </xsl:otherwise>
                                </xsl:choose>
                            </p>
                        </li>
                    </xsl:for-each>
                </ul>
            </section>
        </xsl:if>
    </xsl:template>
    
    <!-- handle particularly long notes -->
    <xsl:variable name="author-notes-length" select="sum(/article//article-meta/author-notes/*[name()=('fn','corresp')]/string-length(normalize-space(.)))" as="xs:integer"/>
    <xsl:variable name="author-notes-limit" select="400" as="xs:integer"/>
    <xsl:variable name="author-notes-max-exceeded" select="$author-notes-length gt $author-notes-limit" as="xs:boolean"/>
    
    <xsl:template match="article-meta/author-notes">
        <xsl:if test="fn or corresp or preceding-sibling::contrib-group/contrib[@contrib-type='author' and @corresp='yes' and email] or parent::article-meta/funding-group">
                <div class="author-notes">
                    <xsl:if test="corresp or preceding-sibling::contrib-group/contrib[@contrib-type='author' and @corresp='yes' and email]">
                        <p>
                            <xsl:choose>
                                <xsl:when test="preceding-sibling::contrib-group/contrib[@contrib-type='author' and @corresp='yes' and email]">
                                    <strong class="email-icon">For correspondence:</strong>
                                    <ul class="list-simple">
                                        <xsl:for-each select="preceding-sibling::contrib-group/contrib[@contrib-type='author' and @corresp='yes']/email">
                                            <li>
                                                <a>
                                                    <xsl:attribute name="href">
                                                        <xsl:value-of select="concat('mailto:',.)"/>
                                                    </xsl:attribute>
                                                    <xsl:value-of select="."/>
                                                </a>
                                            </li>
                                        </xsl:for-each>
                                    </ul>
                                </xsl:when>
                                <xsl:otherwise>
                                    <span class="email-icon"/>
                                    <xsl:apply-templates select="corresp/node()[name()!='label']"/>
                                </xsl:otherwise>
                            </xsl:choose>
                        </p>
                    </xsl:if>
                    <xsl:choose>
                        <xsl:when test="$author-notes-max-exceeded">
                            <p class="author-notes__list_item">
                                <strong>
                                    <xsl:if test="fn/label">
                                        <sup aria-hidden="true">
                                            <xsl:value-of select="string-join(distinct-values(fn/label),', ')"/>
                                        </sup>
                                        <xsl:text>&#xA0;</xsl:text>
                                    </xsl:if>
                                    <xsl:text>Author notes:</xsl:text>
                                </strong>
                                <xsl:text> See </xsl:text>
                                <a class="page-ref" href="#author-notes-expanded"/>
                            </p>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:for-each select="fn">
                                <p class="author-notes__list_item">
                                    <xsl:if test="label">
                                        <sup aria-hidden="true">
                                            <strong>
                                                <xsl:value-of select="./label[1]"/>
                                            </strong>
                                        </sup>
                                        <xsl:text>&#xA0;</xsl:text>
                                    </xsl:if>
                                    <xsl:choose>
                                        <xsl:when test="@fn-type='coi-statement'">
                                            <strong>Competing interests:</strong>
                                            <xsl:text> </xsl:text>
                                            <xsl:value-of select="replace(./p[1],'^[Cc]ompeting [Ii]nterests?( [Ss]tatement)?:\s?','')"/>
                                        </xsl:when>
                                        <xsl:otherwise>
                                            <xsl:apply-templates select="./p/node()"/>
                                        </xsl:otherwise>
                                    </xsl:choose>
                                </p>
                            </xsl:for-each>
                        </xsl:otherwise>
                    </xsl:choose>
                    <xsl:if test="parent::article-meta/funding-group">
                        <p class="author-notes__list_item">
                            <strong>
                                <xsl:text>Funding:</xsl:text>
                            </strong>
                            <xsl:text> See </xsl:text>
                            <a class="page-ref" href="#funding"/>
                        </p>
                    </xsl:if>
                </div>
            </xsl:if>
    </xsl:template>
    
    <xsl:template name="get-name" match="name|string-name">
        <xsl:param name="order" select="'forwards'"/>
        <xsl:choose>
            <xsl:when test="./given-names and ./surname">
                <xsl:choose>
                    <xsl:when test="$order='backwards'">
                        <xsl:value-of select="surname"/>
                        <xsl:text> </xsl:text>
                        <xsl:value-of select="given-names"/>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:value-of select="given-names"/>
                        <xsl:text> </xsl:text>
                        <xsl:value-of select="surname"/>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:when>
            <xsl:otherwise>
                <xsl:apply-templates select="given-names/text()|surname/text()"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <xsl:template match="aff//(institution|city|country)">
        <xsl:apply-templates select="node()"/>
    </xsl:template>
    
    <xsl:template name="get-aff">
        <xsl:param name="id"/>
        <xsl:variable name="aff-node" select="id($id)"/>
        <xsl:apply-templates select="$aff-node/(descendant::*[not(name()=('label','institution-id','institution-wrap','named-content'))]|text())"/>
    </xsl:template>
    
    <xsl:template name="get-author-note">
        <xsl:param name="id"/>
        <xsl:variable name="fn-node" select="id($id)"/>
        <li class="author-list__footnote">
            <sup aria-hidden="true">
                <xsl:value-of select="$fn-node/label[1]"/>
            </sup>
            <xsl:apply-templates select="$fn-node/p/node()"/>
        </li>
    </xsl:template>
    
    <xsl:template name="aside">
         <section id="sideSection" class="side-section">
             <div class="article-status">
                 <div class="review-timeline-container">
                     <dl class="review-timeline review-timeline--expanded" id="review-timeline" aria-label="Version history">
                         <xsl:apply-templates mode="aside" select=".//article-meta/pub-history/event[date[@date-type='reviewed-preprint']]"/>
                         <xsl:apply-templates mode="aside" select=".//article-meta/pub-date[last()]"/>
                     </dl>
                 </div>
             </div>
             <xsl:call-template name="article-notes"/>
         </section>
     </xsl:template>
    
    <xsl:template mode="aside" match="article-meta/pub-history/event[date[@date-type='reviewed-preprint']]">
        <xsl:variable name="is-first-version" select="ends-with(./self-uri[@content-type='reviewed-preprint']/@xlink:href,'1')"/>
        <xsl:variable name="version-class" select="if ($is-first-version) then 'review-timeline__event--reviewed'
                                                   else 'review-timeline__event--revised'"/>
        <dt class="{concat('review-timeline__event review-timeline__event--title review-timeline__event--active review-timeline__event--with-evaluation-summary ',$version-class)}">
            <a href="{./self-uri[@content-type='reviewed-preprint']/@xlink:href}" class="review-timeline__event-link">Reviewed Preprint</a>
        </dt>
        <dd class="{concat('review-timeline__event review-timeline__event--detail review-timeline__event--active review-timeline__event--with-evaluation-summary ',$version-class)}">
            <span class="review-timeline__version">
                <xsl:value-of select="event-desc/substring-after(.,'preprint ')"/>
            </span>
            <xsl:variable name="pub-date-string" select="if (./date/@iso-8601-date) then ./date/@iso-8601-date else '1970-01-01'"/>
            <time class="review-timeline__date" dateTime="{concat($pub-date-string,'T00:00:00.000Z')}">
                <xsl:value-of select="format-date(xs:date($pub-date-string),'[MNn] [D], [Y0001]')"/>
            </time>
            <span class="review-timeline__link">
                <xsl:choose>
                    <xsl:when test="$is-first-version">
                        <xsl:text>Not revised</xsl:text>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:text>Revised by authors</xsl:text>
                    </xsl:otherwise>
                </xsl:choose>
            </span>
        </dd>
    </xsl:template>
    
    <xsl:template mode="aside" match="article-meta/pub-date[last()]">
        <xsl:variable name="is-first-version" select="@date-type='original-publication'"/>
        <xsl:variable name="version-class" select="if ($is-first-version) then 'review-timeline__event--reviewed'
                                                   else 'review-timeline__event--revised'"/>
        <dt class="{concat('review-timeline__event review-timeline__event--title review-timeline__event--active review-timeline__event--with-evaluation-summary ',$version-class)}">Reviewed Preprint</dt>
        <dd class="{concat('review-timeline__event review-timeline__event--detail review-timeline__event--active review-timeline__event--with-evaluation-summary ',$version-class)}">
            <span class="review-timeline__version">
                <xsl:value-of select="concat(' v',$rp-version)"/>
            </span>
            <xsl:variable name="pub-date-string" select="if (./@iso-8601-date) then ./@iso-8601-date else '1970-01-01'"/>
            <time class="review-timeline__date" dateTime="{concat($pub-date-string,'T00:00:00.000Z')}">
                <xsl:value-of select="format-date(xs:date($pub-date-string),'[MNn] [D], [Y0001]')"/>
            </time>
            <span class="review-timeline__link">
                <xsl:choose>
                    <xsl:when test="$is-first-version">
                        <xsl:text>Not revised</xsl:text>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:text>Revised by authors</xsl:text>
                    </xsl:otherwise>
                </xsl:choose>
            </span>
        </dd>
    </xsl:template>
    
    <xsl:template name="main">
        <section id="article-content">
            <xsl:apply-templates select="./sub-article[@article-type='editor-report']"/>
            <xsl:apply-templates select=".//article-meta/abstract"/>
            <xsl:apply-templates select="body | back | processing-instruction('page-break')[not(preceding::sub-article[@article-type=('referee-report','author-comment')])]"/>
        </section>
        <section id="peer-reviews">
            <h1>Peer reviews</h1>
            <xsl:apply-templates select="./sub-article[@article-type=('referee-report','author-comment')] | processing-instruction('page-break')[preceding::sub-article[@article-type=('referee-report','author-comment')]]"/>
        </section>
    </xsl:template>
    
    <xsl:template match="sub-article[@article-type=('editor-report','referee-report','author-comment')]">
        <xsl:variable name="class" select="if (@article-type='editor-report') then 'assessment'
            else if (@article-type='author-comment') then 'author-response'
            else 'review-content'"/>
        <section>
            <xsl:apply-templates select="@id"/>
            <xsl:if test="not(@id)">
                <xsl:attribute name="id">
                    <xsl:value-of select="concat('sub-article','-',
                        count(parent::article/sub-article)-count(following-sibling::sub-article)
                        )"/>
                </xsl:attribute>
            </xsl:if>
            <xsl:attribute name="class">
                <xsl:value-of select="$class"/>
            </xsl:attribute>
            <h2>
                <xsl:apply-templates select="./front-stub//article-title/node()"/>
            </h2>
            <div>
                <xsl:attribute name="class">
                    <xsl:value-of select="concat($class,'__body')"/>
                </xsl:attribute>
                <xsl:apply-templates select="./body"/>
            </div>
            <div class="descriptors">
              <ul class="descriptors__identifiers">
                    <xsl:variable name="sub-article-doi-url" select="concat('https://doi.org/',./front-stub/article-id[@pub-id-type='doi'])"/>
                    <li class="descriptors__identifier">
                        <a href="{$sub-article-doi-url}">
                            <xsl:value-of select="$sub-article-doi-url"/>
                        </a>
                    </li>
              </ul>
            </div>
        </section>
    </xsl:template>
    
    <xsl:template match="article-meta/contrib-group[2]">
        <xsl:if test="contrib[@contrib-type='editor']">
            <div id="editors">
                <xsl:for-each select="contrib[@contrib-type='editor']">
                    <p class="editors-and-reviewers__person">
                        <strong><xsl:text>Reviewing editor: </xsl:text></strong>
                        <xsl:for-each select="./name[1]">
                            <xsl:call-template name="get-name"/>
                        </xsl:for-each>
                        <xsl:if test="./aff[descendant::institution]">
                            <xsl:text>, </xsl:text>
                            <xsl:value-of select="./aff[1]/descendant::institution[1]"/>
                            <xsl:if test="./aff/country">
                                <xsl:text>, </xsl:text>
                                <xsl:value-of select="./aff[1]/country[1]"/>
                            </xsl:if>
                        </xsl:if>
                </p>
                </xsl:for-each>
            </div>
        </xsl:if>
    </xsl:template>
    
    <xsl:template match="article-meta/abstract">
        <section class="abstract">
            <xsl:apply-templates select="@id"/>
            <xsl:if test="not(@id)">
                <xsl:variable name="abstract-index" select="count(parent::article-meta/abstract) - count(following-sibling::abstract)"/>
                <xsl:attribute name="id" select="concat('abstract-',$abstract-index)"/>
            </xsl:if>
            <xsl:if test="not(./title) and not(@abstract-type)">
                <h1>Abstract</h1>
            </xsl:if>
            <xsl:apply-templates select="* | processing-instruction('page-break')"/>
        </section>
    </xsl:template>
    
    <xsl:template match="article/body | sub-article/body">
        <xsl:apply-templates select="* | processing-instruction('page-break')"/>
    </xsl:template>
    
    <xsl:template match="article/back">
        <xsl:apply-templates select="* except ref-list | processing-instruction('page-break')"/>
        <xsl:if test="not(sec[@sec-type='additional-information']) and ($author-notes-max-exceeded or ancestor::article//article-meta[funding-group or related-object] or ancestor::article//article-meta/contrib-group[1][contrib[@contrib-type='author' and contrib-id[@contrib-id-type='orcid']]])">
            <section id="additional-info">
                <h1>Additional information</h1>
                <xsl:apply-templates select="ancestor::article//article-meta/funding-group"/>
                <xsl:if test="ancestor::article//article-meta/related-object[@xlink:href!='' and @document-id-type='clinical-trial-number']">
                    <section id="clintrial">
                        <xsl:apply-templates select="ancestor::article//article-meta/related-object"/>
                    </section>
                </xsl:if>
                <xsl:apply-templates mode="authors-in-back" select="ancestor::article//article-meta/contrib-group[1]"/>
            </section>
        </xsl:if>
        <!-- To do: Accommodate multiple ref lists? -->
        <section id="references">
            <h1 class="heading-1">References</h1>
            <ul class="reference-list">
                <xsl:apply-templates select="//ref"/>
            </ul>
        </section>
    </xsl:template>
    
    <xsl:template match="ack">
        <section id="acknowledgements">
            <xsl:apply-templates select="*[name()!='label'] | processing-instruction('page-break')"/>
        </section>
    </xsl:template>
    
    <!-- Ignore secs marked as web-only -->
    <xsl:template match="sec[@specific-use='web-only'] "/>
    
    <xsl:template match="sec[not(@sec-type=('additional-information','supplementary')) and not(@specific-use='web-only')] | glossary | app">
        <section>
            <xsl:apply-templates select="@id|*[name()!='label'] | processing-instruction('page-break')"/>
        </section>
    </xsl:template>
    
    <xsl:template match="sec[@sec-type='additional-information' and not(@specific-use='web-only')]">
        <section>
            <xsl:apply-templates select="@id|*[name()!='label'] | processing-instruction('page-break')"/>
            <xsl:if test="ancestor::article//article-meta[funding-group or related-object]">
                <xsl:apply-templates select="ancestor::article//article-meta/funding-group"/>
                <xsl:if test="ancestor::article//article-meta/related-object[@xlink:href!='' and @document-id-type='clinical-trial-number']">
                    <section id="clintrial">
                        <xsl:apply-templates select="ancestor::article//article-meta/related-object"/>
                    </section>
                </xsl:if>
            </xsl:if>
            <xsl:apply-templates mode="authors-in-back" select="ancestor::article//article-meta/contrib-group[1][contrib[@contrib-type='author' and contrib-id[@contrib-id-type='orcid']]]"/>
        </section>
    </xsl:template>
    
    <!-- This sec-type is for sections containing only figures and tables
        The first image is treated as anchored/inline, and the rest are floats. 
        This improves the flow of text.
    -->
    <xsl:template match="sec[@sec-type='supplementary' and not(@specific-use='web-only')]">
        <section>
            <xsl:choose>
                <!-- for sections mistagged with this sec-type, treat as a normal section -->
                <xsl:when test="*[not(name()=('label','title','fig','table-wrap'))]">
                    <xsl:apply-templates select="@id|*[name()!='label'] | processing-instruction('page-break')"/>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:apply-templates select="@id|title"/>
                    <xsl:apply-templates mode="anchor" select="*[not(name()=('label','title'))][1]"/>
                    <xsl:apply-templates mode="float" select="*[not(name()=('label','title'))][position() gt 1] | processing-instruction('page-break')"/>
                    <div class="pagebreak"/>
                </xsl:otherwise>
            </xsl:choose>
        </section>
    </xsl:template>
    
    <xsl:template match="statement">
        <section class="statement">
            <xsl:apply-templates select="@id"/>
            <xsl:if test="label or title">
                <h5>
                    <xsl:if test="label">
                        <label>
                            <xsl:apply-templates select="label/node()"/>
                            <xsl:if test="label[not(matches(.,'[\.:]\s*$'))]">
                                <xsl:text>.</xsl:text>
                            </xsl:if>
                        </label>
                    </xsl:if>
                    <xsl:apply-templates select="title/node()"/>
                </h5>
            </xsl:if>
            <xsl:apply-templates select="*[not(name()=('label','title'))] | processing-instruction('page-break')"/>
        </section>
    </xsl:template>
    
    <xsl:template match="boxed-text">
        <section class="boxed-text">
            <xsl:apply-templates select="@id"/>
            <xsl:if test="label or caption/title">
                <h5>
                    <xsl:if test="label">
                        <label>
                            <xsl:apply-templates select="label/node()"/>
                            <xsl:if test="label[not(matches(.,'[\.:]\s*$'))]">
                                <xsl:text>.</xsl:text>
                            </xsl:if>
                        </label>
                    </xsl:if>
                    <xsl:apply-templates select="caption/title/node()"/>
                </h5>
            </xsl:if>
            <xsl:apply-templates select="caption/p|*[not(name()=('label','caption'))] | processing-instruction('page-break')"/>
        </section>
    </xsl:template>
    
    <xsl:template match="app-group">
        <xsl:apply-templates select="* | processing-instruction('page-break')"/>
    </xsl:template>
    
    <xsl:template match="title">
        <xsl:variable name="h1-parents" select="('abstract','ref-list','app','ack')"/>
        <xsl:choose>
            <xsl:when test="parent::*[name()=$h1-parents] or parent::glossary[parent::back or parent::body] or parent::boxed-text[parent::back or parent::body] or parent::statement[parent::back or parent::body]">
                <h1 class="heading-1">
                    <xsl:if test="preceding-sibling::label">
                        <xsl:value-of select="preceding-sibling::label"/>
                        <xsl:text> </xsl:text>
                    </xsl:if>
                    <xsl:apply-templates select="node()"/>
                </h1>
            </xsl:when>
            <xsl:when test="parent::sec or parent::glossary[parent::sec] or parent::boxed-text[parent::sec] or parent::statement[parent::sec]">
                <xsl:variable name="sec-depth" select="count(ancestor::sec) + count(ancestor::abstract) + count(ancestor::app) + count(ancestor::glossary) + count(ancestor::boxed-text) + count(ancestor::statement)"/>
                <xsl:variable name="heading-level">
                    <xsl:value-of select="min((6,$sec-depth))"/>
                </xsl:variable>
                <xsl:element name="h{$heading-level}">
                    <xsl:attribute name="class">
                        <xsl:value-of select="concat('heading-',$heading-level)"/>
                    </xsl:attribute>
                    <xsl:if test="preceding-sibling::label">
                        <xsl:value-of select="preceding-sibling::label"/>
                        <xsl:text> </xsl:text>
                    </xsl:if>
                    <xsl:apply-templates select="node()"/>
                </xsl:element>
            </xsl:when>
            <xsl:when test="parent::caption">
                <h3>
                    <xsl:if test="ancestor::*[name()=('fig','table-wrap')]/label">
                        <span class="label figure-name">
                            <xsl:apply-templates select="ancestor::*[name()=('fig','table-wrap')]/label"/>
                        </span>
                    </xsl:if>
                    <xsl:apply-templates select="node()"/>
                </h3>
            </xsl:when>
            <xsl:otherwise/>
        </xsl:choose>
    </xsl:template>
    
    <!-- To do: add support for element-citation 
         To do: properly support mixed content -->
    <xsl:template match="ref">
        <li class="reference-list__item">
            <xsl:apply-templates select="@id|label|mixed-citation"/>
        </li>
    </xsl:template>
    
    <xsl:template match="ref/label">
        <span class="reference__label">
            <xsl:value-of select="."/>
        </span>
    </xsl:template>
    
    <xsl:template match="ref/mixed-citation[@publication-type=('journal','preprint')]">
        <xsl:apply-templates select="person-group[@person-group-type='author']"/>
        <xsl:apply-templates select="year"/>
        <xsl:apply-templates select="article-title"/>
        <xsl:if test="source or volume or fpage or elocation-id">
            <span class="reference__origin">
                <xsl:if test="source">
                    <i><xsl:value-of select="source"/></i>
                    <xsl:text> </xsl:text>
                </xsl:if>
                <xsl:if test="volume">
                    <strong><xsl:value-of select="volume"/></strong>
                </xsl:if>
                <xsl:if test="volume and (fpage or elocation-id)">
                    <xsl:text>:</xsl:text>
                </xsl:if>
                <xsl:value-of select="fpage"/>
                <xsl:if test="fpage and lpage">
                    <xsl:text>&#x2011;</xsl:text>
                </xsl:if>
                <xsl:value-of select="lpage"/>
                <xsl:if test="elocation-id and not(fpage)">
                    <xsl:value-of select="elocation-id"/>
                </xsl:if>
                <xsl:if test="comment">
                    <xsl:value-of select="comment"/>
                </xsl:if>
            </span>
        </xsl:if>
        <span class="reference__doi">
            <xsl:choose>
                <xsl:when test="pub-id[@pub-id-type='doi']">
                    <xsl:apply-templates select="pub-id"/>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:apply-templates select="pub-id|ext-link"/>
                </xsl:otherwise>
            </xsl:choose>
        </span>
    </xsl:template>
    
    <xsl:template match="ref/mixed-citation[@publication-type=('confproc','book')]">
        <xsl:apply-templates select="person-group[@person-group-type='author']"/>
        <xsl:apply-templates select="year"/>
        <xsl:apply-templates select="article-title | chapter-title"/>
        <xsl:if test="source or edition or volume or fpage or elocation-id">
            <span class="reference__origin">
                <xsl:if test="article-title or chapter-title or person-group[@person-group-type='editor']">
                    <xsl:text>In: </xsl:text>
                </xsl:if>
                <xsl:apply-templates select="person-group[@person-group-type='editor']"/>
                <xsl:if test="person-group[@person-group-type='editor']">
                    <xsl:choose>
                        <xsl:when test="count(person-group[@person-group-type='editor']/*) gt 1">
                            <xsl:text> (Eds). </xsl:text>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:text> (Ed). </xsl:text>
                        </xsl:otherwise>
                    </xsl:choose>
                </xsl:if>
                <xsl:if test="source">
                    <i><xsl:value-of select="source"/></i>
                    <xsl:text> </xsl:text>
                </xsl:if>
                <xsl:if test="conf-name">
                    <xsl:value-of select="conf-name"/>
                    <xsl:text>. </xsl:text>
                </xsl:if>
                <xsl:if test="volume">
                    <strong><xsl:value-of select="volume"/></strong>
                    <xsl:text> </xsl:text>
                </xsl:if>
                <xsl:if test="edition">
                    <xsl:text>(</xsl:text>
                    <xsl:value-of select="edition"/>
                    <xsl:text>) </xsl:text>
                </xsl:if>
                <xsl:if test="publisher-loc or publisher-name or conf-loc">
                    <xsl:choose>
                        <xsl:when test="conf-loc and publisher-loc and publisher-name">
                            <xsl:apply-templates select="conf-loc"/>
                            <xsl:text>. </xsl:text>
                            <xsl:apply-templates select="publisher-loc"/>
                            <xsl:text>: </xsl:text>
                            <xsl:apply-templates select="publisher-name"/>
                        </xsl:when>
                        <xsl:when test="publisher-loc and publisher-name">
                            <xsl:apply-templates select="publisher-loc"/>
                            <xsl:text>: </xsl:text>
                            <xsl:apply-templates select="publisher-name"/>
                        </xsl:when>
                        <xsl:when test="conf-loc and publisher-name">
                            <xsl:apply-templates select="conf-loc"/>
                            <xsl:text>. </xsl:text>
                            <xsl:apply-templates select="publisher-name"/>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:apply-templates select="conf-loc"/>
                            <xsl:apply-templates select="publisher-loc"/>
                            <xsl:apply-templates select="publisher-name"/>
                        </xsl:otherwise>
                    </xsl:choose>
                    <xsl:text>. </xsl:text>
                </xsl:if>
                <xsl:if test="fpage">
                    <xsl:text>pp.&#xA0;</xsl:text>
                    <xsl:value-of select="fpage"/>
                </xsl:if>
                <xsl:if test="fpage and lpage">
                    <xsl:text>&#x2011;</xsl:text>
                    <xsl:value-of select="lpage"/>
                </xsl:if>
                <xsl:if test="elocation-id and not(fpage)">
                    <xsl:value-of select="elocation-id"/>
                </xsl:if>
                <xsl:if test="comment">
                    <xsl:value-of select="comment"/>
                </xsl:if>
            </span>
        </xsl:if>
        <span class="reference__doi">
            <xsl:choose>
                <xsl:when test="pub-id[@pub-id-type='doi']">
                    <xsl:apply-templates select="pub-id"/>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:apply-templates select="pub-id|ext-link"/>
                </xsl:otherwise>
            </xsl:choose>
        </span>
    </xsl:template>
    
    <xsl:template match="ref/mixed-citation[@publication-type=('report','thesis')]">
        <xsl:apply-templates select="person-group[@person-group-type='author']"/>
        <xsl:apply-templates select="year"/>
        <xsl:apply-templates select="source"/>
        <xsl:if test="person-group[@person-group-type='editor'] or publisher-name or fpage or elocation-id">
            <span class="reference__origin">
                <xsl:apply-templates select="person-group[@person-group-type='editor']"/>
                <xsl:if test="person-group[@person-group-type='editor']">
                    <xsl:choose>
                        <xsl:when test="count(person-group[@person-group-type='editor']/*) gt 1">
                            <xsl:text> (Eds). </xsl:text>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:text> (Ed). </xsl:text>
                        </xsl:otherwise>
                    </xsl:choose>
                </xsl:if>
                <xsl:if test="publisher-loc or publisher-name">
                    <xsl:choose>
                        <xsl:when test="publisher-loc and publisher-name">
                            <xsl:apply-templates select="publisher-loc"/>
                            <xsl:text>: </xsl:text>
                            <xsl:apply-templates select="publisher-name"/>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:apply-templates select="publisher-loc"/>
                            <xsl:apply-templates select="publisher-name"/>
                        </xsl:otherwise>
                    </xsl:choose>
                    <xsl:text>. </xsl:text>
                </xsl:if>
                <xsl:if test="fpage">
                    <xsl:text>pp. </xsl:text>
                    <xsl:value-of select="fpage"/>
                </xsl:if>
                <xsl:if test="fpage and lpage">
                    <xsl:text>–</xsl:text>
                    <xsl:value-of select="lpage"/>
                </xsl:if>
                <xsl:if test="elocation-id and not(fpage)">
                    <xsl:value-of select="elocation-id"/>
                </xsl:if>
                <xsl:if test="comment">
                    <xsl:value-of select="comment"/>
                </xsl:if>
            </span>
        </xsl:if>
        <span class="reference__doi">
            <xsl:choose>
                <xsl:when test="pub-id[@pub-id-type='doi']">
                    <xsl:apply-templates select="pub-id"/>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:apply-templates select="pub-id|ext-link"/>
                </xsl:otherwise>
            </xsl:choose>
        </span>
    </xsl:template>
    
    <xsl:template match="ref/mixed-citation[@publication-type=('web','data','software')]">
        <xsl:apply-templates select="person-group[@person-group-type='author']"/>
        <xsl:apply-templates select="year"/>
        <xsl:apply-templates select="article-title  | data-title"/>
        <xsl:if test="source or volume or fpage or elocation-id">
            <span class="reference__origin">
                <xsl:if test="source">
                    <xsl:value-of select="source"/>
                    <xsl:text>. </xsl:text>
                </xsl:if>
                <xsl:if test="version">
                    <xsl:text>version: </xsl:text>
                    <xsl:value-of select="version"/>
                </xsl:if>
                <xsl:if test="pub-id[@pub-id-type='accession']">
                    <xsl:text>ID </xsl:text>
                    <xsl:value-of select="pub-id[@pub-id-type='accession']"/>
                </xsl:if>
                <xsl:if test="date-in-citation">
                    <xsl:text> </xsl:text>
                    <xsl:apply-templates select="date-in-citation"/>
                </xsl:if>
                <xsl:if test="comment">
                    <xsl:text> </xsl:text>
                    <xsl:value-of select="comment"/>
                </xsl:if>
            </span>
        </xsl:if>
        <span class="reference__doi">
            <xsl:choose>
                <xsl:when test="pub-id[@pub-id-type='doi']">
                    <xsl:apply-templates select="pub-id"/>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:apply-templates select="pub-id|ext-link"/>
                </xsl:otherwise>
            </xsl:choose>
        </span>
    </xsl:template>
    
    <xsl:template match="ref/mixed-citation[@publication-type=('other')]">
        <xsl:apply-templates select="person-group[@person-group-type='author']"/>
        <xsl:apply-templates select="year"/>
        <xsl:apply-templates select="article-title | data-title | chapter-title"/>
        <xsl:if test="source or person-group[@person-group-type='editor'] or publisher-name or fpage or elocation-id">
            <span class="reference__origin">
                <xsl:apply-templates select="person-group[@person-group-type='editor']"/>
                <xsl:if test="person-group[@person-group-type='editor']">
                    <xsl:choose>
                        <xsl:when test="count(person-group[@person-group-type='editor']/*) gt 1">
                            <xsl:text> (Eds). </xsl:text>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:text> (Ed). </xsl:text>
                        </xsl:otherwise>
                    </xsl:choose>
                </xsl:if>
                <xsl:if test="source">
                    <xsl:value-of select="source"/>
                    <xsl:text>. </xsl:text>
                </xsl:if>
                <xsl:if test="publisher-loc or publisher-name">
                    <xsl:choose>
                        <xsl:when test="publisher-loc and publisher-name">
                            <xsl:apply-templates select="publisher-loc"/>
                            <xsl:text>: </xsl:text>
                            <xsl:apply-templates select="publisher-name"/>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:apply-templates select="publisher-loc"/>
                            <xsl:apply-templates select="publisher-name"/>
                        </xsl:otherwise>
                    </xsl:choose>
                    <xsl:text>. </xsl:text>
                </xsl:if>
                <xsl:if test="fpage">
                    <xsl:text>pp. </xsl:text>
                    <xsl:value-of select="fpage"/>
                </xsl:if>
                <xsl:if test="fpage and lpage">
                    <xsl:text>–</xsl:text>
                    <xsl:value-of select="lpage"/>
                </xsl:if>
                <xsl:if test="elocation-id and not(fpage)">
                    <xsl:value-of select="elocation-id"/>
                </xsl:if>
                <xsl:if test="date-in-citation">
                    <xsl:text> </xsl:text>
                    <xsl:apply-templates select="date-in-citation"/>
                </xsl:if>
                <xsl:if test="comment">
                    <xsl:text> </xsl:text>
                    <xsl:apply-templates select="comment"/>
                </xsl:if>
            </span>
        </xsl:if>
        <span class="reference__doi">
            <xsl:choose>
                <xsl:when test="pub-id[@pub-id-type='doi']">
                    <xsl:apply-templates select="pub-id"/>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:apply-templates select="pub-id|ext-link"/>
                </xsl:otherwise>
            </xsl:choose>
        </span>
    </xsl:template>
    
    <xsl:template match="mixed-citation/person-group">
        <xsl:variable name="ref-list-class" select="if (@person-group-type='editor') then 'reference__editors_list' 
            else 'reference__authors_list'"/>
        <ol>
            <xsl:attribute name="class" select="$ref-list-class"/>
            <xsl:choose>
                <xsl:when test="count(*) gt 10">
                    <xsl:apply-templates select="*[position() lt 11]"/>
                    <li class="reference__author"><em>et al.</em></li>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:apply-templates select="*"/>
                </xsl:otherwise>
            </xsl:choose>
        </ol>
    </xsl:template>
    
    <xsl:template match="person-group/string-name | person-group/name">
        <li>
            <xsl:attribute name="class">
                <xsl:value-of select="if (parent::*/@person-group-type='editor') then 'reference__editor' else 'reference__author'"/>
            </xsl:attribute>
            <xsl:call-template name="get-name">
                <xsl:with-param name="order">backwards</xsl:with-param>
            </xsl:call-template>
        </li>
    </xsl:template>
    
    <xsl:template match="person-group/collab | person-group/etal">
        <li>
            <xsl:attribute name="class">
                <xsl:value-of select="if (parent::*/@person-group-type='editor') then 'reference__editor' else 'reference__author'"/>
            </xsl:attribute>
            <xsl:apply-templates select="node()"/>
        </li>
    </xsl:template>
    
    <xsl:template match="mixed-citation/year">
        <span class="reference__authors_list_suffix">
            <xsl:value-of select="."/>
        </span>
    </xsl:template>
    
    <xsl:template match="mixed-citation/date-in-citation">
        <xsl:value-of select="concat('Accessed ',.)"/>
    </xsl:template>
    
    <xsl:template match="mixed-citation/article-title | mixed-citation[@publication-type=('book','other')]/chapter-title | mixed-citation[@publication-type=('report','thesis')]/source">
        <span class="reference__title">
            <xsl:apply-templates select="node()"/>
            <xsl:if test="not(matches(.,'\.\s*$'))">
                <xsl:text>.</xsl:text>
            </xsl:if>
        </span>
    </xsl:template>
    
    <xsl:template match="mixed-citation/pub-id">
        <xsl:choose>
            <xsl:when test="@pub-id-type='doi'">
                <xsl:variable name="doi-url" select="concat('https://doi.org/',.)"/>
                <a href="{$doi-url}" class="reference__doi_link">
                    <xsl:value-of select="$doi-url"/>
                </a>
            </xsl:when>
            <xsl:when test="@pub-id-type='pmid'">
                <xsl:variable name="pubmed-url" select="concat('https://pubmed.ncbi.nlm.nih.gov/',.)"/>
                <a href="{$pubmed-url}" class="reference__external_link">
                    <xsl:text>PubMed</xsl:text>
                </a>
            </xsl:when>
            <xsl:when test="@pub-id-type='pmcid'">
                <xsl:variable name="pmc-url" select="concat('https://pmc.ncbi.nlm.nih.gov/articles/',.)"/>
                <a href="{$pmc-url}" class="reference__external_link">
                    <xsl:text>PubMed Central</xsl:text>
                </a>
            </xsl:when>
            <xsl:when test="@xlink:href">
                <a href="{./@xlink:href}" class="reference__external_link">
                    <xsl:value-of select="./@xlink:href"/>
                </a>
            </xsl:when>
        </xsl:choose>
    </xsl:template>
    
    <xsl:template match="mixed-citation/publisher-loc">
        <xsl:apply-templates select="node()"/>
    </xsl:template>
    
    <xsl:template match="mixed-citation/publisher-name">
        <xsl:apply-templates select="node()"/>
    </xsl:template>
    
    <xsl:template match="table-wrap-group">
        <xsl:apply-templates select="*"/>
    </xsl:template>
    
    <xsl:template match="fig|table-wrap[graphic or alternatives/graphic]">
        <xsl:choose>
            <!-- figures with labels and position=float are given their own page -->
            <xsl:when test="label and @position='float' and not(ancestor::sub-article) and not(ancestor::app) and not(ancestor::abstract)">
                <xsl:apply-templates mode="float" select="self::*"/>
            </xsl:when>
            <!-- treat unlablled figures/tables as if they were anchored -->
            <xsl:otherwise>
                <xsl:apply-templates mode="anchor" select="self::*"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <!-- position='float' => A floating image that is placed on it's own page -->
    <xsl:template mode="float" match="fig|table-wrap[graphic or alternatives/graphic]">
        <xsl:variable name="class" select="if (self::table-wrap) then 'table tofill'
            else 'figure tofill'"/>
        <figure class="{$class}">
            <xsl:apply-templates select="@id"/>
            <xsl:apply-templates select="caption"/>
            <xsl:if test="not(caption)">
                <figcaption class="figure__caption">
                    <h3>
                        <span class="label figure-name">
                            <xsl:apply-templates select="label"/>
                        </span>
                    </h3>
                </figcaption>
            </xsl:if>
            <xsl:apply-templates select="descendant::graphic[not(ancestor::caption)]"/>
        </figure>
    </xsl:template>
    
    <!-- position='anchor' => An inline image that is placed in the flow of text -->
    <xsl:template mode="anchor" match="fig|table-wrap[graphic or alternatives/graphic]">
        <div class="fig-group">
            <xsl:variable name="class" select="if (self::table-wrap) then 'table movedfig'
            else 'figure movedfig'"/>
            <p class="{$class}">
                <xsl:apply-templates select="@id"/>
                <xsl:apply-templates select="descendant::graphic"/>
            </p>
            <xsl:apply-templates mode="inline" select="caption"/>
            <xsl:if test="label and not(caption)">
                <p class="figure__caption">
                    <span class="label figure-name">
                        <xsl:apply-templates select="label"/>
                    </span>
                </p>
            </xsl:if>
            <xsl:apply-templates select="permissions|attrib"/>
        </div>
    </xsl:template>
    
    <xsl:template match="graphic[not(ancestor::caption) and (ancestor::fig or ancestor::table-wrap)]">
        <xsl:param name="give-boundary" select="false()"/>
        <xsl:variable name="image-uri" select="concat(
            $iiif-base-uri,
            replace(./@xlink:href,'/','%2F'),
            '/full/max/0/default.jpg'
            )"/>
        <xsl:variable name="class" select="if (ancestor::fig) then 'child-of-figure has-boundary imageonly'
            else if ($give-boundary) then 'child-of-figure has-boundary imageonly'
            else 'child-of-figure imageonly'"/>
        <img class="{$class}" loading="eager" src="{$image-uri}" alt=""/>
    </xsl:template>
    
    <xsl:template match="fig/label|table-wrap[graphic or alternatives/graphic]/label">
        <label class="figure__label">
            <xsl:value-of select="concat(replace(.,'\s*[\.\|:]\s*$',''),'.')"/>
        </label>
    </xsl:template>
    
    <xsl:template match="fig/caption|table-wrap[graphic or alternatives/graphic]/caption">
        <figcaption class="figure__caption">
            <xsl:if test="not(title) and parent::*/label">
                <h3>
                    <span class="label figure-name">
                        <xsl:apply-templates select="parent::*/label"/>
                    </span>
                </h3>
            </xsl:if>
            <xsl:apply-templates select="*|parent::*/permissions|parent::*/attrib"/>
        </figcaption>
    </xsl:template>
    
    <!-- How to treat captions for anchored/inline figures -->
    <xsl:template mode="inline" match="fig/caption|table-wrap[graphic or alternatives/graphic]/caption">
        <p class="figure__caption">
            <xsl:if test="parent::*/label">
                <span class="label figure-name">
                    <xsl:apply-templates select="parent::*/label"/>
                </span>
            </xsl:if>
            <xsl:if test="title">
                <strong>
                    <xsl:apply-templates select="title/node()"/>
                </strong>
                <xsl:text> </xsl:text>
            </xsl:if>
            <xsl:apply-templates select="p/node()"/>
        </p>
    </xsl:template>
    
    <xsl:template match="supplementary-material">
        <p>
            <xsl:apply-templates select="@id"/>
            <xsl:call-template name="add-icon">
                <xsl:with-param name="elem" select="."/>
            </xsl:call-template>
            <xsl:apply-templates select="caption"/>
        </p>
    </xsl:template>
    
    <xsl:template match="supplementary-material/caption">
        <xsl:if test="title">
            <xsl:apply-templates select="title/node()"/>
            <xsl:text> </xsl:text>
        </xsl:if>
        <xsl:apply-templates select="p/node()"/>
        <xsl:if test="parent::*/permissions">
            <xsl:text> </xsl:text>
            <xsl:apply-templates select="parent::*/permissions"/>
        </xsl:if>
    </xsl:template>
    
    <xsl:template match="permissions[not(ancestor::article-meta)]">
        <xsl:choose>
            <xsl:when test="copyright-statement and license/license-p">
                <p>
                    <xsl:apply-templates select="copyright-statement/node()"/>
                    <xsl:text>. </xsl:text>
                    <xsl:apply-templates select="license/license-p/node()"/>
                </p>
            </xsl:when>
            <xsl:when test="copyright-year and copyright-holder and license/license-p">
                <p>
                    <xsl:text>© </xsl:text>
                    <xsl:apply-templates select="copyright-year/node()"/>
                    <xsl:text>, </xsl:text>
                    <xsl:apply-templates select="copyright-holder/node()"/>
                    <xsl:text>. </xsl:text>
                    <xsl:apply-templates select="license/license-p/node()"/>
                </p>
            </xsl:when>
            <xsl:when test="(copyright-year or copyright-holder) and license/license-p">
                <p>
                    <xsl:text>© </xsl:text>
                    <xsl:apply-templates select="*[name()=('copyright-year','copyright-holder')]/node()"/>
                    <xsl:text>. </xsl:text>
                    <xsl:apply-templates select="license/license-p/node()"/>
                </p>
            </xsl:when>
            <xsl:when test="license/license-p">
                <p><xsl:apply-templates select="license/license-p/node()"/></p>
            </xsl:when>
            <xsl:otherwise/>
        </xsl:choose>
    </xsl:template>
    
    <!-- To do: style this differently -->
    <xsl:template match="attrib">
        <p>
            <xsl:apply-templates select="node()"/>
        </p>
    </xsl:template>
    
    <xsl:template match="disp-formula[graphic or alternatives/graphic]">
        <xsl:choose>
            <xsl:when test="not(parent::p)">
                <p>
                    <xsl:apply-templates select="descendant::graphic"/>
                </p>
            </xsl:when>
            <xsl:otherwise>
                <xsl:apply-templates select="descendant::graphic"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <xsl:template match="inline-formula[inline-graphic or alternatives/inline-graphic]">
        <xsl:apply-templates select="descendant::inline-graphic"/>
    </xsl:template>
    
    <xsl:template match="graphic[ancestor::disp-formula] | inline-graphic[ancestor::inline-formula]">
        <xsl:variable name="image-uri" select="concat(
            $iiif-base-uri,
            ./@xlink:href,
            '/full/max/0/default.jpg'
            )"/>
        <xsl:variable name="formula-type-class" select="if (ancestor::disp-formula) then 'imageonly disp-formula'
                                                        else 'insidetext inline-formula'"/>
        <xsl:variable name="class" select="string-join(
            ('child-of-p',
            $formula-type-class),' ')"/>
        <img class="{$class}" loading="eager" src="{$image-uri}" alt="">
            <xsl:if test="ancestor::*[name()=('disp-formula','inline-formula')]/@id">
                <xsl:attribute name="id" select="ancestor::*[name()=('disp-formula','inline-formula')]/@id"/>
            </xsl:if>
        </img>
    </xsl:template>
    
    <xsl:template match="list">
        <xsl:variable name="list-class">
            <xsl:choose>
                <xsl:when test="not(./@list-type) or @list-type=''">
                    <xsl:value-of select="'list-simple'"/>
                </xsl:when>
                <xsl:when test="./@list-type!='simple' and list-item/label and not(list-item[not(label)])">
                    <xsl:value-of select="'list-simple'"/>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:value-of select="concat('list-',./@list-type)"/>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <xsl:choose>
            <xsl:when test="$list-class=('list-simple','list-custom','list-bullet')">
                <ul>
                    <xsl:attribute name="class">
                        <xsl:value-of select="$list-class"/>
                    </xsl:attribute>
                    <xsl:apply-templates select="@id|*"/>
                </ul>
            </xsl:when>
            <xsl:otherwise>
                <ol>
                    <xsl:attribute name="class">
                        <xsl:value-of select="$list-class"/>
                    </xsl:attribute>
                    <xsl:apply-templates select="@id|*"/>
                </ol>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <xsl:template match="p">
        <!-- Wrap each disp-formula in its own p -->
        <xsl:for-each-group select="node()" group-starting-with="disp-formula">
            <p>
                <xsl:apply-templates select="current-group()"/>
            </p>
        </xsl:for-each-group>
    </xsl:template>
    
    <xsl:template match="list-item">
        <li>
            <xsl:apply-templates select="@id|*"/>
        </li>
    </xsl:template>
    
    <xsl:template match="list-item/p[label]">
        <p>
            <xsl:value-of select="label[1]"/>
            <xsl:text> </xsl:text>
            <xsl:apply-templates select="node()"/>
        </p>
    </xsl:template>
    
    <!-- To do: Add proper semantic HTML support: <dl> -->
    <xsl:template match="def-list">
        <ul class="list-simple">
            <xsl:apply-templates select="@id|*"/>
        </ul>
    </xsl:template>
    
    <xsl:template match="def-item">
        <li>
            <p>
                <xsl:apply-templates select="*"/>
            </p>
        </li>
    </xsl:template>
    
    <xsl:template match="def-item/term">
         <xsl:apply-templates select="node()"/>
         <xsl:text>: </xsl:text>
    </xsl:template>
    
    <xsl:template match="def-item/def">
        <xsl:apply-templates select="p/node()"/>
    </xsl:template>
    
    <xsl:template match="disp-quote">
        <blockquote>
            <xsl:apply-templates select="*"/>
        </blockquote>
    </xsl:template>
    
    <xsl:template match="preformat | code">
        <xsl:choose>
            <xsl:when test="parent::p or parent::td or parent::th">
                <code>
                    <xsl:apply-templates select="@id|node()"/>
                </code>
            </xsl:when>
            <xsl:otherwise>
                <pre>
                    <xsl:apply-templates select="@id|node()"/>
                </pre>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <xsl:template match="funding-group">
        <xsl:variable name="has-authors" select="boolean(descendant::principal-award-recipient)"/>
        <section id="funding">
            <h2>Funding</h2>
            <table id="funding-table">
                <thead>
                    <tr>
                        <th>Funder</th>
                        <th>Grant reference number</th>
                        <xsl:if test="$has-authors">
                            <th>Author</th>
                        </xsl:if>
                    </tr>
                </thead>
                <tbody>
                    <xsl:apply-templates select="award-group|funding-statement">
                        <xsl:with-param name="including-authors" select="$has-authors"/>
                    </xsl:apply-templates>
                </tbody>
            </table>
        </section>
    </xsl:template>
    
    <xsl:template match="award-group">
        <xsl:param name="including-authors" select="false()"/>
        <tr>
            <td>
                <xsl:apply-templates select="descendant::institution[1]/node()"/>
            </td>
            <td>
                <xsl:apply-templates select="award-id"/>
            </td>
            <xsl:if test="$including-authors">
                <td>
                    <xsl:apply-templates select="principal-award-recipient"/>
                </td>
            </xsl:if>
        </tr>
    </xsl:template>
    
    <xsl:template match="award-id">
        <xsl:choose>
            <xsl:when test="@award-id-type='doi'">
                <a>
                    <xsl:attribute name="href">
                        <xsl:value-of select="'https://doi.org/'||."/>
                    </xsl:attribute>
                    <xsl:value-of select="'https://doi.org/'||."/>
                </a>
            </xsl:when>
            <xsl:otherwise>
                <xsl:value-of select="."/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <xsl:template match="principal-award-recipient">
        <xsl:for-each select="name|institution">
            <xsl:if test="preceding-sibling::*">
                <br/>
            </xsl:if>
            <xsl:choose>
                <xsl:when test="surname and given-names">
                    <xsl:value-of select="given-names[1]||' '||surname[1]"/>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:value-of select="."/>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:for-each>
    </xsl:template>
    
    <xsl:template match="funding-statement">
        <xsl:param name="including-authors" select="false()"/>
        <xsl:variable name="colspan" select="if ($including-authors) then 3 else 2"/>
        <tr class="funding-statement">
            <td colspan="{$colspan}">
                <xsl:apply-templates select="node()"/>
            </td>
        </tr>
    </xsl:template>
    
    <xsl:template match="related-object">
        <xsl:choose>
            <xsl:when test="@xlink:href!='' and @document-id-type='clinical-trial-number'">
                <xsl:choose>
                    <xsl:when test="parent::p or ancestor::abstract">
                        <a>
                           <xsl:attribute name="href">
                               <xsl:value-of select="@xlink:href"/>
                           </xsl:attribute>
                            <xsl:apply-templates select="node()"/>
                        </a>
                    </xsl:when>
                    <xsl:when test="parent::article-meta">
                        <p> 
                            <xsl:text>Clinical trial number: </xsl:text>
                            <a>
                                <xsl:attribute name="href">
                                    <xsl:value-of select="@xlink:href"/>
                                </xsl:attribute>
                                <xsl:apply-templates select="node()"/>
                            </a>
                        </p>
                    </xsl:when>
                    <xsl:otherwise/>
                </xsl:choose>
            </xsl:when>
            <xsl:otherwise/>
        </xsl:choose>
    </xsl:template>
    
    <xsl:template match="bold">
        <strong>
            <xsl:if test="ancestor::sub-article[@article-type='editor-report']">
                <xsl:attribute name="class">highlighted-term</xsl:attribute>
                <xsl:attribute name="aria-label">Highlighted</xsl:attribute>
            </xsl:if>
            <xsl:apply-templates select="node()"/>
        </strong>
    </xsl:template>
    
    <xsl:template match="italic">
        <em>
            <xsl:apply-templates select="node()"/>
        </em>
    </xsl:template>
    
    <!-- To do: Fix this semantically -->
    <xsl:template match="monospace">
        <code>
            <xsl:apply-templates select="node()"/>
        </code>
    </xsl:template>
    
     <!-- This adds an icon next to links -->
    <xsl:template match="ext-link">
        <xsl:choose>
            <!-- Don't add the icon in references and in copyright statement -->
            <xsl:when test="ancestor::ref or ancestor::permissions[parent::article-meta]">
                <a>
                    <xsl:attribute name="href">
                        <xsl:value-of select="@xlink:href"/>
                    </xsl:attribute>
                    <xsl:apply-templates select="node()"/>
                </a>
            </xsl:when>
            <xsl:otherwise>
                <xsl:call-template name="add-icon">
                    <xsl:with-param name="elem" select="."/>
                </xsl:call-template>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    
    <xsl:template match="xref[ancestor::body or ancestor::back]">
        <xsl:choose>
            <!-- Don't add the icon when it's just a numbered reference citation -->
            <xsl:when test="./@ref-type='bibr' and matches(.,'^\d{1,3}$')">
                <a class="linktoref" href="{concat('#',@rid)}">
                    <xsl:apply-templates select="node()"/>
                </a>
            </xsl:when>
            <xsl:otherwise>
                <xsl:call-template name="add-icon">
                    <xsl:with-param name="elem" select="."/>
                </xsl:call-template>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <xsl:template match="email">
        <xsl:call-template name="add-icon">
            <xsl:with-param name="elem" select="."/>
        </xsl:call-template>
    </xsl:template>
    
    <!-- This adds an icon next to certain links (i.e. those with long embedded text or 
        that are likely to span multiple lines in article body content) -->
    <xsl:template name="add-icon">
        <xsl:param name="elem"/>
        <xsl:choose>
            <xsl:when test="$elem/name()='ext-link'">
                <span class="fakelink linktoext">
                    <span class="fakelink-text"><xsl:apply-templates select="$elem/node()"/></span>
                    <a class="fake-icon" href="{$elem/@xlink:href}">
                        <span class="fakelink-icon">&#xA0;&#xA0;&#xA0;&#xA0;&#xA0;</span>
                    </a>
                </span>
            </xsl:when>
            <xsl:when test="$elem/name()='supplementary-material'">
                <xsl:variable name="file-uri" select="concat(
                    'https://prod--epp.elifesciences.org/api/files/',
                    $msid,
                    '/v',
                    $rp-version,
                    '/content/',
                    $elem/media[1]/@xlink:href
                    )"/>
                <span class="fakelink linktoext">
                    <span class="fakelink-text"><xsl:apply-templates select="$elem/label[1]"/></span>
                    <a class="fake-icon" href="{$file-uri}">
                        <span class="fakelink-icon">&#xA0;&#xA0;&#xA0;&#xA0;&#xA0;</span>
                    </a>
                </span>
            </xsl:when>
            <xsl:when test="$elem/name()='xref'">
                <xsl:variable name="class" select="if ($elem/@ref-type='bibr') then 'linktoref'
                    else 'linktofig'"/>
                <span class="{concat('fakelink ',$class)}">
                    <span class="fakelink-text"><xsl:apply-templates select="$elem/node()"/></span>
                    <a class="fake-icon" href="{concat('#',$elem/@rid)}">
                        <span class="fakelink-icon">&#xA0;&#xA0;&#xA0;&#xA0;&#xA0;</span>
                    </a>
                </span>
            </xsl:when>
            <xsl:when test="$elem/name()='email'">
                <span class="fakelink linktoext">
                    <span class="fakelink-text"><xsl:apply-templates select="$elem/node()"/></span>
                    <a class="fake-icon" href="{concat('mailto:',$elem/data())}">
                        <span class="fakelink-icon">&#xA0;&#xA0;&#xA0;&#xA0;&#xA0;</span>
                    </a>
                </span>
            </xsl:when>
            <!-- No idea what this is - just retain it as is -->
            <xsl:otherwise>
                <xsl:copy>
                    <xsl:apply-templates select="@*|node()"/>
                </xsl:copy>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <!-- This fixes a font issue with the phi symbol -->
    <xsl:template match="text()[matches(.,'ϕ')]">
        <xsl:analyze-string select="." regex="{'ϕ'}">
            <xsl:matching-substring>
                <span class="fix-phi">
                    <xsl:value-of select="."/>
                </span>
            </xsl:matching-substring>
            <xsl:non-matching-substring>
                <xsl:value-of select="."/>
            </xsl:non-matching-substring>
        </xsl:analyze-string>
    </xsl:template>
    
    <xsl:function name="e:get-copyright-holder">
    <xsl:param name="contrib-group"/>
    <xsl:variable name="author-count" select="count($contrib-group/contrib[@contrib-type='author'])"/>
    <xsl:choose>
      <xsl:when test="$author-count lt 1"/>
      <xsl:when test="$author-count = 1">
        <xsl:value-of select="e:get-surname($contrib-group/contrib[@contrib-type='author'][1])"/>
      </xsl:when>
      <xsl:when test="$author-count = 2">
        <xsl:value-of select="concat(
            e:get-surname($contrib-group/contrib[@contrib-type='author'][1]),
            ' and ',
            e:get-surname($contrib-group/contrib[@contrib-type='author'][2])
            )"/>
      </xsl:when>
      <!-- author count is 3+ -->
      <xsl:otherwise>
        <xsl:variable name="is-equal-contrib" select="if ($contrib-group/contrib[@contrib-type='author'][1]/@equal-contrib='yes') then true() else false()"/>
        <xsl:choose>
          <xsl:when test="$is-equal-contrib">
            <!-- when there's more than one first author -->
            <xsl:variable name="first-authors" select="$contrib-group/contrib[@contrib-type='author' and @equal-contrib='yes' and not(preceding-sibling::contrib[not(@equal-contrib='yes')])]"/>
            <xsl:choose>
              <!-- when there are 3 authors total, and they're all equal contrib -->
              <xsl:when test="$author-count = 3 and count($first-authors) = 3">
                <xsl:value-of select="concat(e:get-surname($contrib-group/contrib[@contrib-type='author'][1]),
                  ', ',
                  e:get-surname($contrib-group/contrib[@contrib-type='author'][2]),
                  ' and ',
                  e:get-surname($contrib-group/contrib[@contrib-type='author'][3]))"/>
              </xsl:when>
              <!-- when there are more than 3 first authors (and more than 3 authors total) -->
              <xsl:when test="count($first-authors) gt 3">
                <xsl:variable name="first-auth-string" select="string-join(for $auth in $contrib-group/contrib[@contrib-type='author'][position() lt 4] return e:get-surname($auth),', ')"/>
                <xsl:value-of select="concat($first-auth-string,' et al.')"/>
              </xsl:when>
              <!-- when there are 3 or fewer first authors (and more than 3 authors total) -->
              <xsl:otherwise>
                <xsl:variable name="first-auth-string" select="string-join(for $auth in $first-authors return e:get-surname($auth),', ')"/>
                <xsl:value-of select="concat($first-auth-string,' et al.')"/>
              </xsl:otherwise>
            </xsl:choose>
          </xsl:when>
          <!-- when there's one first author -->
          <xsl:otherwise>
            <xsl:value-of select="concat(e:get-surname($contrib-group/contrib[@contrib-type='author'][1]),' et al.')"/>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:function>
  
  <xsl:function name="e:get-surname" as="text()">
    <xsl:param name="contrib"/>
    <xsl:choose>
      <xsl:when test="$contrib/collab">
        <xsl:value-of select="$contrib/collab[1]/text()[1]"/>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$contrib/descendant::name[1]/surname[1]"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:function>
    
</xsl:stylesheet>